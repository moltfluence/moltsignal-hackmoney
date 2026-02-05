import type { AgentScoreBreakdown, AgentScoreInput, WalletAddress } from "./types.js";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 1;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function normalizeAgainstMedian(value: number, med: number): number {
  if (med <= 0) {
    return 0;
  }
  return clamp((value / med) * 100);
}

export type AdsWeights = {
  distribution: number;
  engagement: number;
  reliability: number;
  network: number;
};

export const ADS_V1_WEIGHTS: AdsWeights = {
  distribution: 0.4,
  engagement: 0.25,
  reliability: 0.2,
  network: 0.15,
};

export function computeAdsScores(
  inputs: AgentScoreInput[],
  budgetWei: bigint,
  priorAdsByAgent: Record<string, number>,
  weights: AdsWeights = ADS_V1_WEIGHTS,
): AgentScoreBreakdown[] {
  if (inputs.length === 0) {
    return [];
  }

  const impressionsMedian = median(inputs.map((row) => row.impressions));
  const engagementRates = inputs.map((row) => {
    const weighted = row.likes + 2 * row.comments + 3 * row.reposts;
    return weighted / Math.max(1, row.impressions);
  });
  const engagementMedian = Math.max(0.00001, median(engagementRates));

  const networkRaw = inputs.map((row) => {
    return row.interactingAgents.reduce((acc, wallet) => {
      return acc + (priorAdsByAgent[wallet.toLowerCase()] ?? 0);
    }, 0);
  });
  const maxNetworkLog = Math.max(1, ...networkRaw.map((value) => Math.log1p(value)));

  const raw = inputs.map((row, index) => {
    const distribution = normalizeAgainstMedian(row.impressions, impressionsMedian);
    const weighted = row.likes + 2 * row.comments + 3 * row.reposts;
    const rate = weighted / Math.max(1, row.impressions);
    const engagement = normalizeAgainstMedian(rate, engagementMedian);

    const reliabilityBase =
      (row.validProofs / Math.max(1, row.expectedProofs)) * 100 - row.invalidProofs * 20;
    const reliability = clamp(reliabilityBase);

    const network = clamp((Math.log1p(networkRaw[index]) / maxNetworkLog) * 100);

    const adsScore =
      weights.distribution * distribution +
      weights.engagement * engagement +
      weights.reliability * reliability +
      weights.network * network;

    return {
      wallet: row.wallet,
      distribution,
      engagement,
      reliability,
      network,
      adsBasisPoints: Math.round(clamp(adsScore) * 100),
    };
  });

  const basePool = (budgetWei * 70n) / 100n;
  const bonusPool = budgetWei - basePool;
  const totalAds = raw.reduce((sum, item) => sum + item.adsBasisPoints, 0);

  const payouts = new Map<WalletAddress, bigint>();
  for (const item of raw) {
    const share = totalAds > 0 ? (basePool * BigInt(item.adsBasisPoints)) / BigInt(totalAds) : 0n;
    payouts.set(item.wallet, share);
  }

  const sorted = [...raw].sort((a, b) => b.adsBasisPoints - a.adsBasisPoints);
  const winnersCount = Math.max(1, Math.ceil(sorted.length / 4));
  const winners = sorted.slice(0, winnersCount);
  const winnersAds = winners.reduce((sum, item) => sum + item.adsBasisPoints, 0);
  for (const winner of winners) {
    const bonus =
      winnersAds > 0 ? (bonusPool * BigInt(winner.adsBasisPoints)) / BigInt(winnersAds) : 0n;
    payouts.set(winner.wallet, (payouts.get(winner.wallet) ?? 0n) + bonus);
  }

  let allocated = 0n;
  const result: AgentScoreBreakdown[] = raw.map((item) => {
    const payoutWei = payouts.get(item.wallet) ?? 0n;
    allocated += payoutWei;
    return { ...item, payoutWei };
  });

  if (allocated < budgetWei && result.length > 0) {
    result[0].payoutWei += budgetWei - allocated;
  }

  return result;
}
