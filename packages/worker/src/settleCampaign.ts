import {
  ADS_V1_WEIGHTS,
  campaignEscrowAbi,
  computeAdsScores,
  fetchMoltbookSnapshot,
  hashAttestationRows,
  hashCanonicalJson,
  hashSettlementRows,
  reputationAttestorAbi,
  type AgentScoreInput,
} from "@molt/shared";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
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

function toInput(wallet: `0x${string}`, snapshots: SnapshotRow[]): AgentScoreInput {
  const validProofs = snapshots.length;
  const aggregate = snapshots.reduce(
    (acc, row) => {
      acc.impressions += row.impressions;
      acc.likes += row.likes;
      acc.comments += row.comments;
      acc.reposts += row.reposts;
      if (Array.isArray(row.interactingAgents)) {
        for (const agent of row.interactingAgents) {
          acc.interactingAgents.add(agent.toLowerCase() as `0x${string}`);
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
    },
  );

  return {
    wallet,
    impressions: aggregate.impressions,
    likes: aggregate.likes,
    comments: aggregate.comments,
    reposts: aggregate.reposts,
    interactingAgents: [...aggregate.interactingAgents],
    validProofs,
    invalidProofs: 0,
    expectedProofs: Math.max(1, validProofs),
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
    const results = new Map<string, SnapshotRow[]>();
    for (const participant of campaign.participants) {
      results.set(participant.agent.wallet.toLowerCase(), []);
    }

    for (const proof of campaign.proofs) {
      let snapshot = proof.fetchedSnapshotJson as SnapshotRow;
      try {
        snapshot = await fetchMoltbookSnapshot(proof.postUrl, config.allowlist);
      } catch {
        // Preserve the originally captured snapshot if live fetch fails.
      }

      const wallet = agentWalletById.get(proof.agentId)?.toLowerCase();
      if (!wallet) {
        continue;
      }
      results.get(wallet)?.push(snapshot);
    }

    return results;
  });

  const scoring = await orchestrator.runStage("compute-scores", async () => {
    const priorAds: Record<string, number> = {};
    for (const participant of campaign.participants) {
      priorAds[participant.agent.wallet.toLowerCase()] = participant.agent.currentAds;
    }

    const inputs: AgentScoreInput[] = [];
    for (const [wallet, snapshots] of grouped.entries()) {
      if (snapshots.length === 0) {
        continue;
      }
      inputs.push(toInput(wallet as `0x${string}`, snapshots));
    }

    const budgetWei = BigInt(campaign.budgetWei);
    const scores = computeAdsScores(inputs, budgetWei, priorAds, ADS_V1_WEIGHTS);
    if (scores.length === 0) {
      throw new Error("cannot settle campaign without at least one valid score row");
    }

    return { priorAds, scores };
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

    return run.id;
  });

  return {
    settleTx: settled.settleTx,
    attestTx,
    scoreRunId: persisted,
    yellowSettlement,
    traces: orchestrator.getTraces(),
  };
}
