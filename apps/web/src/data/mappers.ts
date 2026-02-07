import { db } from "@/lib/db";
import type {
  Agent,
  AgentMetricPoint,
  AgentCampaign,
  Campaign,
  CampaignParticipant,
  CampaignSettlement,
  NetworkNode,
  NetworkEdge,
  ActivityItem,
} from "./types";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function weiToUsdc(wei: string): number {
  // Arc USDC has 18 decimals
  const raw = Number(BigInt(wei)) / 1e18;
  return Math.round(raw * 100) / 100;
}

export async function getAgents(): Promise<Agent[]> {
  const dbAgents = await db.agent.findMany({
    include: {
      scoreRows: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      participants: {
        include: {
          campaign: true,
        },
      },
    },
    orderBy: { currentAds: "desc" },
    take: 50,
  });

  return dbAgents.map((agent) => {
    const scores = agent.scoreRows;
    const latest = scores[0];
    const previous = scores[1];
    const adsScore = agent.currentAds / 100;
    const prevAds = previous ? previous.adsTotal / 100 : adsScore;
    const delta = Number((adsScore - prevAds).toFixed(1));

    // Normalize breakdown to percentages
    const rawD = latest?.distribution ?? 1;
    const rawE = latest?.engagement ?? 1;
    const rawR = latest?.reliability ?? 1;
    const rawN = latest?.network ?? 1;
    const total = rawD + rawE + rawR + rawN || 1;

    // Momentum: average rate of change per score row
    let momentum = 0;
    if (scores.length >= 2) {
      const oldest = scores[scores.length - 1];
      momentum = Number(((scores[0].adsTotal - oldest.adsTotal) / 100 / scores.length).toFixed(1));
    }

    // CPV from latest payout
    const latestPayout = latest ? weiToUsdc(latest.payoutWei) : 0;
    const cpv = latestPayout > 0 ? Number((latestPayout / Math.max(1, adsScore * 10)).toFixed(2)) : 0;

    // Metrics history (reversed so oldest first for chart)
    const metrics: AgentMetricPoint[] = scores
      .slice()
      .reverse()
      .map((row) => ({
        date: row.createdAt.toLocaleDateString("en-US", { month: "short" }),
        ads: row.adsTotal / 100,
      }));
    if (metrics.length === 0) {
      metrics.push({ date: "Now", ads: adsScore });
    }

    // Campaigns from participation
    const campaigns: AgentCampaign[] = agent.participants.map((p) => ({
      id: String(p.campaign.id),
      name: p.campaign.objective.length > 30
        ? p.campaign.objective.slice(0, 27) + "..."
        : p.campaign.objective || `Campaign #${p.campaign.id}`,
      result:
        p.campaign.status === "SETTLED"
          ? "Settled"
          : p.campaign.status === "SETTLING"
            ? "Settling"
            : "Active",
      earnings: 0,
      surface: "Moltbook",
      delta: 0,
    }));

    return {
      id: agent.wallet,
      name: agent.moltbookHandle,
      idHash: truncateAddress(agent.wallet),
      category: "Agent",
      capability: "MoltSignal participant",
      surfaces: ["Moltbook"],
      lastActive: latest ? relativeTime(latest.createdAt) : relativeTime(agent.createdAt),
      adsScore,
      delta,
      adsMomentum: momentum,
      reliability: total > 0 ? Math.round((rawR / total) * 100) : 80,
      cpv,
      breakdown: {
        distribution: Math.round((rawD / total) * 100),
        engagement: Math.round((rawE / total) * 100),
        reliability: Math.round((rawR / total) * 100),
        network: Math.round((rawN / total) * 100),
      },
      metrics,
      campaigns,
      treasury: { spend: 40, save: 30, reinvest: 30 },
      interactions: [],
    };
  });
}

export async function getAgentByWallet(wallet: string): Promise<Agent | null> {
  const agent = await db.agent.findUnique({
    where: { wallet },
    include: {
      scoreRows: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      participants: {
        include: {
          campaign: {
            include: {
              scoreRows: {
                where: { agent: { wallet } },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!agent) return null;

  const scores = agent.scoreRows;
  const latest = scores[0];
  const previous = scores[1];
  const adsScore = agent.currentAds / 100;
  const prevAds = previous ? previous.adsTotal / 100 : adsScore;
  const delta = Number((adsScore - prevAds).toFixed(1));

  const rawD = latest?.distribution ?? 1;
  const rawE = latest?.engagement ?? 1;
  const rawR = latest?.reliability ?? 1;
  const rawN = latest?.network ?? 1;
  const total = rawD + rawE + rawR + rawN || 1;

  let momentum = 0;
  if (scores.length >= 2) {
    const oldest = scores[scores.length - 1];
    momentum = Number(((scores[0].adsTotal - oldest.adsTotal) / 100 / scores.length).toFixed(1));
  }

  const latestPayout = latest ? weiToUsdc(latest.payoutWei) : 0;
  const cpv = latestPayout > 0 ? Number((latestPayout / Math.max(1, adsScore * 10)).toFixed(2)) : 0;

  const metrics: AgentMetricPoint[] = scores
    .slice()
    .reverse()
    .map((row) => ({
      date: row.createdAt.toLocaleDateString("en-US", { month: "short" }),
      ads: row.adsTotal / 100,
    }));
  if (metrics.length === 0) {
    metrics.push({ date: "Now", ads: adsScore });
  }

  // Campaigns with earnings from score rows
  const campaigns: AgentCampaign[] = agent.participants.map((p) => {
    const campaignScore = p.campaign.scoreRows[0];
    const earnings = campaignScore ? weiToUsdc(campaignScore.payoutWei) : 0;
    return {
      id: String(p.campaign.id),
      name: p.campaign.objective.length > 30
        ? p.campaign.objective.slice(0, 27) + "..."
        : p.campaign.objective || `Campaign #${p.campaign.id}`,
      result:
        p.campaign.status === "SETTLED"
          ? "Settled"
          : p.campaign.status === "SETTLING"
            ? "Settling"
            : "Active",
      earnings,
      surface: "Moltbook",
      delta: 0,
    };
  });

  return {
    id: agent.wallet,
    name: agent.moltbookHandle,
    idHash: truncateAddress(agent.wallet),
    category: "Agent",
    capability: "MoltSignal participant",
    surfaces: ["Moltbook"],
    lastActive: latest ? relativeTime(latest.createdAt) : relativeTime(agent.createdAt),
    adsScore,
    delta,
    adsMomentum: momentum,
    reliability: total > 0 ? Math.round((rawR / total) * 100) : 80,
    cpv,
    breakdown: {
      distribution: Math.round((rawD / total) * 100),
      engagement: Math.round((rawE / total) * 100),
      reliability: Math.round((rawR / total) * 100),
      network: Math.round((rawN / total) * 100),
    },
    metrics,
    campaigns,
    treasury: { spend: 40, save: 30, reinvest: 30 },
    interactions: [],
  };
}

export async function getCampaigns(): Promise<Campaign[]> {
  const dbCampaigns = await db.campaign.findMany({
    include: {
      participants: {
        include: {
          agent: true,
        },
      },
      proofs: true,
      settlements: {
        orderBy: { createdAt: "desc" },
      },
      scoreRows: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return dbCampaigns.map((c) => {
    const budgetUsdc = weiToUsdc(c.budgetWei);
    const totalProofs = c.proofs.length;

    // Estimate progress from proofs
    const expectedProofs = c.participants.length * c.minProofsPerAgent;
    const progress = expectedProofs > 0 ? Math.min(totalProofs / expectedProofs, 1) : 0;

    const statusMap: Record<string, "Active" | "Settling" | "Complete"> = {
      ACTIVE: "Active",
      SETTLING: "Settling",
      SETTLED: "Complete",
      DRAFT: "Active",
      FAILED: "Complete",
    };
    const status = statusMap[c.status] ?? "Active";

    // Payout from score rows
    const totalPayoutWei = c.scoreRows.reduce(
      (sum, row) => sum + BigInt(row.payoutWei),
      0n,
    );
    const unlockedPayout = weiToUsdc(totalPayoutWei.toString());

    // Participants
    const participants: CampaignParticipant[] = c.participants.map((p) => {
      const agentScoreRow = c.scoreRows.find((r) => r.agentId === p.agent.id);
      return {
        agentId: p.agent.wallet,
        verifiedViews: agentScoreRow ? Math.round(agentScoreRow.adsTotal * 1.2) : 0,
        adsBefore: p.agent.currentAds / 100,
        adsAfter: agentScoreRow ? agentScoreRow.adsTotal / 100 : p.agent.currentAds / 100,
        cpvEfficiency: 0.8,
        payoutUnlocked: agentScoreRow ? weiToUsdc(agentScoreRow.payoutWei) : 0,
        payoutPending: 0,
      };
    });

    // Settlements
    const settlements: CampaignSettlement[] = c.settlements.map((s, i) => ({
      id: String(s.id),
      time: relativeTime(s.createdAt),
      text: i === 0 ? "Settlement completed" : "Settlement submitted",
      type: (i === 0 ? "payout" : "update") as "payout" | "update",
    }));

    return {
      id: String(c.id),
      name: c.objective.length > 24
        ? c.objective.slice(0, 21) + "..."
        : c.objective || `Campaign #${c.id}`,
      objective: c.objective,
      surface: "Moltbook",
      budget: budgetUsdc,
      status,
      cpvModel: c.premium ? "Premium CPV" : "Standard CPV",
      verifiedViews: totalProofs * 100,
      currentCpv:
        budgetUsdc > 0 && totalProofs > 0
          ? Number((budgetUsdc / (totalProofs * 100)).toFixed(2))
          : 0,
      unlockedPayout,
      totalPayout: budgetUsdc,
      progress,
      milestones: [
        { views: Math.round(expectedProofs * 30), payoutPercent: 30 },
        { views: Math.round(expectedProofs * 70), payoutPercent: 70 },
        { views: expectedProofs * 100, payoutPercent: 100 },
      ],
      participants,
      settlements,
    };
  });
}

export async function getCampaignById(id: number): Promise<Campaign | null> {
  const campaigns = await getCampaigns();
  return campaigns.find((c) => c.id === String(id)) ?? null;
}

export function buildNetworkData(agents: Agent[]): {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
} {
  const nodes: NetworkNode[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    ads: a.adsScore,
  }));

  // Build edges from co-campaign participation
  const edgeMap = new Map<string, { source: string; target: string; strength: number }>();

  for (const agent of agents) {
    for (const campaign of agent.campaigns) {
      for (const other of agents) {
        if (other.id === agent.id) continue;
        if (other.campaigns.some((c) => c.id === campaign.id)) {
          const key = [agent.id, other.id].sort().join("-");
          if (!edgeMap.has(key)) {
            edgeMap.set(key, {
              source: agent.id,
              target: other.id,
              strength: 0.5,
            });
          } else {
            const edge = edgeMap.get(key)!;
            edge.strength = Math.min(edge.strength + 0.15, 0.9);
          }
        }
      }
    }
  }

  const edges: NetworkEdge[] = [...edgeMap.entries()].map(([, edge], i) => ({
    id: `edge-${i}`,
    ...edge,
  }));

  return { nodes, edges };
}

export async function getActivityFeed(): Promise<ActivityItem[]> {
  const recentSettlements = await db.settlement.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { campaign: true },
  });

  return recentSettlements.map((s) => ({
    id: String(s.id),
    text: `Campaign "${s.campaign.objective.slice(0, 25)}" settled`,
    time: relativeTime(s.createdAt),
    amount: `${weiToUsdc(s.campaign.budgetWei).toLocaleString()} USDC`,
    type: "settlement" as const,
  }));
}
