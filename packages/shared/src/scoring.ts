import type { AgentScoreBreakdown, AgentScoreInput, InteractionActor, WalletAddress } from "./types.js";

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

function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

function interactionSignal(actor: InteractionActor): number {
  const c = actor.counts?.comments ?? 0;
  const v = actor.counts?.votes ?? 0;
  const r = actor.counts?.reposts ?? 0;
  return 1.0 * c + 0.3 * v + 0.8 * r;
}

function computeEntropyNormalized(probs: number[]): number {
  const n = probs.length;
  if (n < 2) return 0;
  let h = 0;
  for (const p of probs) {
    if (p <= 0) continue;
    h += -p * Math.log(p);
  }
  const denom = Math.log(n);
  if (denom <= 0) return 0;
  return Math.max(0, Math.min(1, h / denom));
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
  opts?: {
    priorAdsByHandle?: Record<string, number>;
  },
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

  const priorAdsByHandle = opts?.priorAdsByHandle ?? {};

  const networkStatsRaw = inputs.map((row) => {
    // Prefer deterministic interaction ledger (handles + counts) if present.
    const actors = Array.isArray(row.interactionActors) ? row.interactionActors : null;

    if (actors && actors.length > 0) {
      const signals: Array<{ handle: string; signal: number; reach?: number }> = [];
      for (const actor of actors) {
        const handle = normalizeHandle(actor.handle);
        if (!handle) continue;
        const signal = interactionSignal(actor);
        if (signal <= 0) continue;
        signals.push({ handle, signal, reach: actor.reach });
      }

      const totalSignal = signals.reduce((acc, item) => acc + item.signal, 0);
      const probs = totalSignal > 0 ? signals.map((s) => s.signal / totalSignal) : [];
      const topShare = probs.length ? Math.max(...probs) : 0;
      const entropy = computeEntropyNormalized(probs);

      let influenceRaw = 0;
      for (const item of signals) {
        const prior = priorAdsByHandle[normalizeHandle(item.handle)] ?? 0;
        const reachQuality =
          typeof item.reach === "number" && item.reach > 0 ? Math.log1p(item.reach) * 100 : 0;
        const quality = Math.max(prior, reachQuality);
        influenceRaw += quality * Math.sqrt(item.signal);
      }

      return {
        uniqueActors: signals.length,
        topShare,
        entropy,
        influenceRaw,
      };
    }

    // Back-compat: treat interactingAgents as unique interactors, each with unit signal.
    const unique = new Map<string, number>();
    for (const wallet of row.interactingAgents ?? []) {
      const w = wallet.toLowerCase();
      unique.set(w, (unique.get(w) ?? 0) + 1);
    }

    const counts = [...unique.values()];
    const total = counts.reduce((acc, c) => acc + c, 0);
    const probs = total > 0 ? counts.map((c) => c / total) : [];
    const topShare = probs.length ? Math.max(...probs) : 0;
    const entropy = computeEntropyNormalized(probs);
    const influenceRaw = [...unique.keys()].reduce((acc, w) => acc + (priorAdsByAgent[w] ?? 0), 0);

    return {
      uniqueActors: unique.size,
      topShare,
      entropy,
      influenceRaw,
    };
  });

  const uniqueMedian = Math.max(1, median(networkStatsRaw.map((row) => row.uniqueActors)));
  const maxInfluenceLog = Math.max(1, ...networkStatsRaw.map((row) => Math.log1p(row.influenceRaw)));

  const raw = inputs.map((row, index) => {
    const distribution = normalizeAgainstMedian(row.impressions, impressionsMedian);
    const weighted = row.likes + 2 * row.comments + 3 * row.reposts;
    const rate = weighted / Math.max(1, row.impressions);
    const engagement = normalizeAgainstMedian(rate, engagementMedian);

    const reliabilityBase =
      (row.validProofs / Math.max(1, row.expectedProofs)) * 100 - row.invalidProofs * 20;
    const reliability = clamp(reliabilityBase);

    const ns = networkStatsRaw[index]!;
    const breadth = normalizeAgainstMedian(ns.uniqueActors, uniqueMedian);
    const influence = clamp((Math.log1p(ns.influenceRaw) / maxInfluenceLog) * 100);
    const concentration = clamp((1 - ns.topShare) * 100);
    const network = clamp(0.45 * breadth + 0.45 * influence + 0.1 * concentration);

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
      networkUniqueActors: ns.uniqueActors,
      networkTopShare: ns.topShare,
      networkEntropy: ns.entropy,
      networkInfluence: ns.influenceRaw,
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
