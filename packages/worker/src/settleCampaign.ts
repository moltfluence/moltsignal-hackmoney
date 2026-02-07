import {
  ADS_V1_WEIGHTS,
  agentRegistry8004Abi,
  campaignEscrowAbi,
  computeAdsScores,
  hashAttestationRows,
  hashCanonicalJson,
  hashSettlementRows,
  reputationAttestorAbi,
  reputationRegistry8004Abi,
  type AgentScoreInput,
} from "@molt/shared";
import { createPublicClient, createWalletClient, decodeEventLog, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createOrchestrationRunner } from "./agents/runner.js";
import { getYellowSessionAgent, isYellowEnabled } from "./agents/YellowSessionAgent.js";
import { prisma } from "./db.js";
import { config } from "./config.js";

type SnapshotRow = {
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  interactingAgents?: string[];
  interactions?: {
    actors?: Array<{
      handle: string;
      reach?: number;
      verified?: boolean;
      counts: { comments: number; votes: number; reposts: number };
    }>;
  };
};

function monadChain() {
  return defineChain({
    id: config.chainId,
    name: "Arc Testnet",
    // Arc uses USDC as native gas token.
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });
}

function toInput(
  wallet: `0x${string}`,
  rows: Array<{ snapshot: SnapshotRow; valid: boolean }>,
  expectedProofs: number,
): AgentScoreInput {
  const validProofs = rows.reduce((acc, r) => acc + (r.valid ? 1 : 0), 0);
  const invalidProofs = rows.reduce((acc, r) => acc + (r.valid ? 0 : 1), 0);

  const aggregate = rows.reduce(
    (acc, row) => {
      const snap = row.snapshot;
      acc.impressions += snap.impressions ?? 0;
      acc.likes += snap.likes ?? 0;
      acc.comments += snap.comments ?? 0;
      acc.reposts += snap.reposts ?? 0;
      if (Array.isArray(snap.interactingAgents)) {
        for (const agent of snap.interactingAgents) {
          acc.interactingAgents.add(agent.toLowerCase() as `0x${string}`);
        }
      }
      if (Array.isArray(snap.interactions?.actors)) {
        for (const actor of snap.interactions.actors) {
          const key = (actor.handle ?? "").trim().toLowerCase();
          if (!key) continue;
          const prev = acc.interactionActors.get(key);
          const nextCounts = {
            comments: (prev?.counts.comments ?? 0) + (actor.counts?.comments ?? 0),
            votes: (prev?.counts.votes ?? 0) + (actor.counts?.votes ?? 0),
            reposts: (prev?.counts.reposts ?? 0) + (actor.counts?.reposts ?? 0),
          };
          acc.interactionActors.set(key, {
            handle: actor.handle,
            reach: Math.max(prev?.reach ?? 0, actor.reach ?? 0) || prev?.reach || actor.reach,
            verified: Boolean(prev?.verified || actor.verified),
            counts: nextCounts,
          });
        }
      }
      return acc;
    },
    {
      impressions: 0,
      likes: 0,
      comments: 0,
      reposts: 0,
      interactingAgents: new Set<`0x${string}`>(),
      interactionActors: new Map<
        string,
        { handle: string; reach?: number; verified?: boolean; counts: { comments: number; votes: number; reposts: number } }
      >(),
    },
  );

  return {
    wallet,
    impressions: aggregate.impressions,
    likes: aggregate.likes,
    comments: aggregate.comments,
    reposts: aggregate.reposts,
    interactingAgents: [...aggregate.interactingAgents],
    interactionActors: [...aggregate.interactionActors.values()],
    validProofs,
    invalidProofs,
    expectedProofs: Math.max(1, expectedProofs),
  };
}

export async function settleCampaign(campaignId: number) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      participants: { include: { agent: true } },
      proofs: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }
  if (campaign.status === "SETTLED") {
    return { skipped: true, reason: "already settled" };
  }

  const orchestrator = createOrchestrationRunner({
    campaignId,
    config: config.orchestration,
  });

  const agentWalletById = new Map<number, `0x${string}`>();
  for (const participant of campaign.participants) {
    agentWalletById.set(participant.agent.id, participant.agent.wallet.toLowerCase() as `0x${string}`);
  }

  const grouped = await orchestrator.runStage("ingest-proofs", async () => {
    const results = new Map<string, Array<{ snapshot: SnapshotRow; valid: boolean }>>();
    for (const participant of campaign.participants) {
      results.set(participant.agent.wallet.toLowerCase(), []);
    }

    for (const proof of campaign.proofs) {
      const snapshot = proof.fetchedSnapshotJson as SnapshotRow;

      const wallet = agentWalletById.get(proof.agentId)?.toLowerCase();
      if (!wallet) {
        continue;
      }
      results.get(wallet)?.push({ snapshot, valid: Boolean((proof as { valid?: boolean }).valid) });
    }

    return results;
  });

  const scoring = await orchestrator.runStage("compute-scores", async () => {
    const priorAdsByWallet: Record<string, number> = {};
    const priorAdsByHandle: Record<string, number> = {};
    for (const participant of campaign.participants) {
      priorAdsByWallet[participant.agent.wallet.toLowerCase()] = participant.agent.currentAds;
      priorAdsByHandle[participant.agent.moltbookHandle.toLowerCase()] = participant.agent.currentAds;
    }

    const inputs: AgentScoreInput[] = [];
    const expectedProofs = (campaign as { minProofsPerAgent?: number }).minProofsPerAgent ?? 1;
    for (const [wallet, rows] of grouped.entries()) {
      if (rows.length === 0) {
        continue;
      }
      inputs.push(toInput(wallet as `0x${string}`, rows, expectedProofs));
    }

    const budgetWei = BigInt(campaign.budgetWei);
    const scores = computeAdsScores(inputs, budgetWei, priorAdsByWallet, ADS_V1_WEIGHTS, {
      priorAdsByHandle,
    });
    if (scores.length === 0) {
      throw new Error("cannot settle campaign without at least one valid score row");
    }

    return { priorAds: priorAdsByWallet, scores };
  });

  const sponsorAccount = privateKeyToAccount(config.sponsorPrivateKey);
  const oracleAccount = privateKeyToAccount(config.oraclePrivateKey);
  const chain = monadChain();
  const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) });
  const sponsorClient = createWalletClient({
    account: sponsorAccount,
    chain,
    transport: http(config.rpcUrl),
  });
  const oracleClient = createWalletClient({
    account: oracleAccount,
    chain,
    transport: http(config.rpcUrl),
  });

  const chainId = config.chainId;
  const chainCampaignId = campaign.chainCampaignId;

  const signedSettlement = await orchestrator.runStage("sign-settlement", async () => {
    const campaignState = await publicClient.readContract({
      address: config.escrowAddress,
      abi: campaignEscrowAbi,
      functionName: "campaigns",
      args: [chainCampaignId],
    });

    const nonce = BigInt(campaignState[4]);

    const settlementRows = scoring.scores.map((row) => {
      const proofHashes = campaign.proofs
        .filter(
          (proof: { agentId: number }) =>
            agentWalletById.get(proof.agentId)?.toLowerCase() === row.wallet.toLowerCase(),
        )
        .map((proof: { proofHash: string }) => proof.proofHash as `0x${string}`);

      return {
        agent: row.wallet,
        payoutWei: row.payoutWei,
        adsScore: row.adsBasisPoints,
        proofHash: proofHashes[0] ?? hashCanonicalJson({ empty: true, wallet: row.wallet }),
      };
    });

    const rowsHash = hashSettlementRows(settlementRows);

    const settlementSig = await oracleClient.signTypedData({
      account: oracleAccount,
      domain: {
        name: "MoltSignalEscrow",
        version: "1",
        chainId,
        verifyingContract: config.escrowAddress,
      },
      types: {
        SettlementData: [
          { name: "campaignId", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "rowsHash", type: "bytes32" },
        ],
      },
      primaryType: "SettlementData",
      message: {
        campaignId: chainCampaignId,
        nonce,
        rowsHash,
      },
    });

    return {
      settlementRows,
      rowsHash,
      settlementSig,
    };
  });

  const settled = await orchestrator.runStage("submit-settlement", async () => {
    const settleTx = await sponsorClient.writeContract({
      address: config.escrowAddress,
      abi: campaignEscrowAbi,
      functionName: "settleCampaign",
      args: [chainCampaignId, signedSettlement.settlementRows, signedSettlement.settlementSig],
      account: sponsorAccount,
    });
    const settleReceipt = await publicClient.waitForTransactionReceipt({ hash: settleTx });

    return {
      settleTx,
      settleReceipt,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Yellow Network Session Settlement (if enabled)
  // ─────────────────────────────────────────────────────────────────────────
  let yellowSettlement: { closed: number; failed: number } | null = null;

  if (campaign.yellowEnabled && isYellowEnabled()) {
    yellowSettlement = await orchestrator.runStage("close-yellow-sessions", async () => {
      console.log(`[settleCampaign] Closing Yellow sessions for campaign ${campaignId}`);

      try {
        const yellowAgent = getYellowSessionAgent();
        const result = await yellowAgent.closeAllSessionsForCampaign(campaignId);

        console.log(
          `[settleCampaign] Yellow settlement complete: ${result.closed} closed, ${result.failed} failed`
        );

        return {
          closed: result.closed,
          failed: result.failed,
        };
      } catch (error) {
        // Log but don't fail the entire settlement if Yellow fails
        console.error(`[settleCampaign] Yellow session closure failed:`, error);
        return {
          closed: 0,
          failed: -1, // Indicates complete failure
        };
      }
    });
  }

  const signedAttestation = await orchestrator.runStage("sign-attestation", async () => {
    const attestationRows = scoring.scores.map((row) => {
      const oldAds = scoring.priorAds[row.wallet.toLowerCase()] ?? 0;
      return {
        agent: row.wallet,
        adsDelta: row.adsBasisPoints - oldAds,
        adsAfter: row.adsBasisPoints,
        metricsHash: hashCanonicalJson({ wallet: row.wallet, campaignId, rowsHash: signedSettlement.rowsHash }),
      };
    });

    const attestationNonce = await publicClient.readContract({
      address: config.attestorAddress,
      abi: reputationAttestorAbi,
      functionName: "campaignNonce",
      args: [chainCampaignId],
    });
    const attestationRowsHash = hashAttestationRows(attestationRows);

    const attestationSig = await oracleClient.signTypedData({
      account: oracleAccount,
      domain: {
        name: "MoltSignalAttestor",
        version: "1",
        chainId,
        verifyingContract: config.attestorAddress,
      },
      types: {
        AttestationData: [
          { name: "campaignId", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "rowsHash", type: "bytes32" },
        ],
      },
      primaryType: "AttestationData",
      message: {
        campaignId: chainCampaignId,
        nonce: attestationNonce,
        rowsHash: attestationRowsHash,
      },
    });

    return {
      attestationRows,
      attestationSig,
    };
  });

  const attestTx = await orchestrator.runStage("submit-attestation", async () => {
    const tx = await sponsorClient.writeContract({
      address: config.attestorAddress,
      abi: reputationAttestorAbi,
      functionName: "attestBatch",
      args: [chainCampaignId, signedAttestation.attestationRows, signedAttestation.attestationSig],
      account: sponsorAccount,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return tx;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ERC-8004 Reputation Feedback (if configured)
  // ─────────────────────────────────────────────────────────────────────────
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  let erc8004Feedback:
    | {
        submitted: number;
        failed: number;
        rows: Array<{
          agentId: number;
          nftTokenId: bigint;
          value: number;
          txHash: `0x${string}`;
        }>;
      }
    | null = null;

  if (config.reputationRegistryAddress !== zeroAddress) {
    erc8004Feedback = await orchestrator.runStage("submit-erc8004-feedback", async () => {
      let submitted = 0;
      let failed = 0;
      const rows: Array<{
        agentId: number;
        nftTokenId: bigint;
        value: number;
        txHash: `0x${string}`;
      }> = [];

      for (const row of scoring.scores) {
        const agent = campaign.participants.find(
          (p: { agent: { wallet: string } }) =>
            p.agent.wallet.toLowerCase() === row.wallet.toLowerCase(),
        )?.agent;

        // JIT retry: if agent has no nftTokenId but we stored their registration signature,
        // attempt the ERC-8004 Identity Registry mint now before giving feedback.
        if (!agent?.nftTokenId && agent?.registrationSig) {
          try {
            const agentUri = `data:application/json,${encodeURIComponent(
              JSON.stringify({ name: agent.moltbookHandle, wallet: agent.wallet })
            )}`;

            const regTx = await oracleClient.writeContract({
              address: config.agentRegistryAddress,
              abi: agentRegistry8004Abi,
              functionName: "registerFor",
              args: [
                agent.wallet as `0x${string}`,
                agent.moltbookHandle,
                agentUri,
                agent.registrationSig as `0x${string}`,
              ],
              account: oracleAccount,
            });
            const regReceipt = await publicClient.waitForTransactionReceipt({ hash: regTx });

            for (const log of regReceipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: agentRegistry8004Abi,
                  data: log.data,
                  topics: log.topics,
                });
                if (decoded.eventName === "Registered") {
                  const mintedId = (decoded.args as { agentId: bigint }).agentId;
                  agent.nftTokenId = mintedId;
                  await prisma.agent.update({
                    where: { id: agent.id },
                    data: { nftTokenId: mintedId, agentUri },
                  });
                  break;
                }
              } catch {
                continue;
              }
            }
          } catch (err) {
            console.error(
              `[settleCampaign] JIT ERC-8004 registration failed for agent ${agent.id}:`,
              err,
            );
          }
        }

        if (!agent?.nftTokenId) {
          failed++;
          continue;
        }

        try {
          const tx = await oracleClient.writeContract({
            address: config.reputationRegistryAddress,
            abi: reputationRegistry8004Abi,
            functionName: "giveFeedback",
            args: [
              BigInt(agent.nftTokenId),
              BigInt(row.adsBasisPoints),
              2, // valueDecimals (basis points)
              "moltsignal",
              "ads-v1",
              "",
              "",
              signedSettlement.rowsHash,
            ],
            account: oracleAccount,
          });
          await publicClient.waitForTransactionReceipt({ hash: tx });
          rows.push({
            agentId: agent.id,
            nftTokenId: BigInt(agent.nftTokenId),
            value: row.adsBasisPoints,
            txHash: tx,
          });
          submitted++;
        } catch (err) {
          console.error(`[settleCampaign] ERC-8004 feedback failed for agent ${agent.id}:`, err);
          failed++;
        }
      }

      return { submitted, failed, rows };
    });
  }

  const persisted = await orchestrator.runStage("persist-results", async () => {
    const run = await prisma.scoreRun.create({
      data: {
        campaignId,
        weightsJson: ADS_V1_WEIGHTS,
        scorerVersion: "ads-v1",
      },
    });

    for (const row of scoring.scores) {
      const agent = campaign.participants.find(
        (participant: { agent: { wallet: string } }) =>
          participant.agent.wallet.toLowerCase() === row.wallet.toLowerCase(),
      )?.agent;
      if (!agent) {
        continue;
      }

      await prisma.scoreRow.create({
        data: {
          scoreRunId: run.id,
          campaignId,
          agentId: agent.id,
          distribution: row.distribution,
          engagement: row.engagement,
          reliability: row.reliability,
          network: row.network,
          networkUniqueActors: row.networkUniqueActors,
          networkTopShare: row.networkTopShare,
          networkEntropy: row.networkEntropy,
          networkInfluence: row.networkInfluence,
          adsTotal: row.adsBasisPoints,
          payoutWei: row.payoutWei.toString(),
          proofHash:
            signedSettlement.settlementRows.find(
              (item) => item.agent.toLowerCase() === row.wallet.toLowerCase(),
            )?.proofHash ?? hashCanonicalJson({ empty: true }),
        },
      });

      await prisma.agent.update({
        where: { id: agent.id },
        data: { currentAds: row.adsBasisPoints },
      });
    }

    await prisma.settlement.create({
      data: {
        campaignId,
        txHash: settled.settleTx,
        blockNumber: settled.settleReceipt.blockNumber,
        oracleSigner: oracleAccount.address,
      },
    });

    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SETTLED" } });

    // Persist ERC-8004 feedback records
    if (erc8004Feedback?.rows?.length) {
      for (const feedbackRow of erc8004Feedback.rows) {
        await prisma.erc8004Feedback.create({
          data: {
            campaignId,
            agentId: feedbackRow.agentId,
            nftTokenId: feedbackRow.nftTokenId,
            value: feedbackRow.value,
            txHash: feedbackRow.txHash,
          },
        });
      }
    }

    return run.id;
  });

  return {
    settleTx: settled.settleTx,
    attestTx,
    scoreRunId: persisted,
    yellowSettlement,
    erc8004Feedback,
    traces: orchestrator.getTraces(),
  };
}
