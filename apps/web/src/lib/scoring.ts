import { ADS_V1_WEIGHTS, computeAdsScores, hashCanonicalJson, type AgentScoreInput } from "@molt/shared";
import type { Campaign, ProofSubmission, CampaignParticipant, Agent } from "@prisma/client";

export function buildInputs(
  participants: Array<CampaignParticipant & { agent: Agent }>,
  proofs: ProofSubmission[],
): AgentScoreInput[] {
  const byWallet = new Map<string, AgentScoreInput>();

  for (const participant of participants) {
    byWallet.set(participant.agent.wallet.toLowerCase(), {
      wallet: participant.agent.wallet.toLowerCase() as `0x${string}`,
      impressions: 0,
      likes: 0,
      comments: 0,
      reposts: 0,
      interactingAgents: [],
      validProofs: 0,
      invalidProofs: 0,
      expectedProofs: 1,
    });
  }

  for (const proof of proofs) {
    const participant = participants.find((item) => item.agentId === proof.agentId);
    if (!participant) continue;

    const input = byWallet.get(participant.agent.wallet.toLowerCase());
    if (!input) continue;

    const snapshot = proof.fetchedSnapshotJson as {
      impressions?: number;
      likes?: number;
      comments?: number;
      reposts?: number;
      interactingAgents?: string[];
    };

    input.impressions += snapshot.impressions ?? 0;
    input.likes += snapshot.likes ?? 0;
    input.comments += snapshot.comments ?? 0;
    input.reposts += snapshot.reposts ?? 0;
    input.validProofs += proof.valid ? 1 : 0;
    input.invalidProofs += proof.valid ? 0 : 1;
    if (Array.isArray(snapshot.interactingAgents)) {
      input.interactingAgents.push(
        ...snapshot.interactingAgents.map((wallet) => wallet.toLowerCase() as `0x${string}`),
      );
    }
  }

  return [...byWallet.values()];
}

export function computeLeaderboard(
  campaign: Campaign,
  participants: Array<CampaignParticipant & { agent: Agent }>,
  proofs: ProofSubmission[],
) {
  const inputs = buildInputs(participants, proofs);
  const priorAdsByAgent = Object.fromEntries(
    participants.map((item) => [item.agent.wallet.toLowerCase(), item.agent.currentAds]),
  );
  const scores = computeAdsScores(inputs, BigInt(campaign.budgetWei), priorAdsByAgent, ADS_V1_WEIGHTS);

  return scores.map((row) => ({
    wallet: row.wallet,
    adsBasisPoints: row.adsBasisPoints,
    payoutWei: row.payoutWei.toString(),
    distribution: row.distribution,
    engagement: row.engagement,
    reliability: row.reliability,
    network: row.network,
    proofHash:
      proofs.find(
        (proof) =>
          participants.find((p) => p.agentId === proof.agentId)?.agent.wallet.toLowerCase() ===
          row.wallet.toLowerCase(),
      )?.proofHash ?? hashCanonicalJson({ empty: true, wallet: row.wallet }),
  }));
}
