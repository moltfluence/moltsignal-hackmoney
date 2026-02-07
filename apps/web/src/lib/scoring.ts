import { ADS_V1_WEIGHTS, computeAdsScores, hashCanonicalJson, type AgentScoreInput } from "@molt/shared";
import type { Campaign, ProofSubmission, CampaignParticipant, Agent } from "@prisma/client";

export function buildInputs(
  participants: Array<CampaignParticipant & { agent: Agent }>,
  proofs: ProofSubmission[],
  minProofsPerAgent: number,
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
      interactionActors: [],
      validProofs: 0,
      invalidProofs: 0,
      expectedProofs: Math.max(1, Number.isFinite(minProofsPerAgent) ? minProofsPerAgent : 1),
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
      interactions?: {
        actors?: Array<{
          handle: string;
          reach?: number;
          verified?: boolean;
          counts: { comments: number; votes: number; reposts: number };
        }>;
      };
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
    if (Array.isArray(snapshot.interactions?.actors)) {
      const merged = new Map<string, { handle: string; reach?: number; verified?: boolean; counts: { comments: number; votes: number; reposts: number } }>();
      for (const actor of input.interactionActors ?? []) {
        merged.set(actor.handle.toLowerCase(), {
          handle: actor.handle,
          reach: actor.reach,
          verified: actor.verified,
          counts: { ...actor.counts },
        });
      }
      for (const actor of snapshot.interactions.actors) {
        const key = actor.handle.trim().toLowerCase();
        if (!key) continue;
        const prev = merged.get(key);
        const nextCounts = {
          comments: (prev?.counts.comments ?? 0) + (actor.counts?.comments ?? 0),
          votes: (prev?.counts.votes ?? 0) + (actor.counts?.votes ?? 0),
          reposts: (prev?.counts.reposts ?? 0) + (actor.counts?.reposts ?? 0),
        };
        merged.set(key, {
          handle: actor.handle,
          reach: Math.max(prev?.reach ?? 0, actor.reach ?? 0) || prev?.reach || actor.reach,
          verified: Boolean(prev?.verified || actor.verified),
          counts: nextCounts,
        });
      }
      input.interactionActors = [...merged.values()];
    }
  }

  return [...byWallet.values()];
}

export function computeLeaderboard(
  campaign: Campaign,
  participants: Array<CampaignParticipant & { agent: Agent }>,
  proofs: ProofSubmission[],
) {
  const inputs = buildInputs(participants, proofs, (campaign as { minProofsPerAgent?: number }).minProofsPerAgent ?? 1);
  const priorAdsByWallet = Object.fromEntries(
    participants.map((item) => [item.agent.wallet.toLowerCase(), item.agent.currentAds]),
  );
  const priorAdsByHandle = Object.fromEntries(
    participants.map((item) => [item.agent.moltbookHandle.toLowerCase(), item.agent.currentAds]),
  );
  const scores = computeAdsScores(inputs, BigInt(campaign.budgetWei), priorAdsByWallet, ADS_V1_WEIGHTS, {
    priorAdsByHandle,
  });

  return scores.map((row) => ({
    wallet: row.wallet,
    adsBasisPoints: row.adsBasisPoints,
    payoutWei: row.payoutWei.toString(),
    distribution: row.distribution,
    engagement: row.engagement,
    reliability: row.reliability,
    network: row.network,
    networkUniqueActors: row.networkUniqueActors,
    networkTopShare: row.networkTopShare,
    networkEntropy: row.networkEntropy,
    networkInfluence: row.networkInfluence,
    proofHash:
      proofs.find(
        (proof) =>
          participants.find((p) => p.agentId === proof.agentId)?.agent.wallet.toLowerCase() ===
          row.wallet.toLowerCase(),
      )?.proofHash ?? hashCanonicalJson({ empty: true, wallet: row.wallet }),
  }));
}
