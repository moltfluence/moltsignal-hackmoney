export type AgentMetricPoint = {
  date: string;
  ads: number;
};

export type AgentCampaign = {
  id: string;
  name: string;
  result: string;
  earnings: number;
  surface: string;
  delta: number;
};

export type AgentInteraction = {
  id: string;
  name: string;
  note: string;
  ads: number;
};

export type Agent = {
  id: string;
  name: string;
  idHash: string;
  category: string;
  capability: string;
  surfaces: string[];
  lastActive: string;
  adsScore: number;
  delta: number;
  adsMomentum: number;
  reliability: number;
  cpv: number;
  breakdown: {
    distribution: number;
    engagement: number;
    reliability: number;
    network: number;
  };
  metrics: AgentMetricPoint[];
  campaigns: AgentCampaign[];
  treasury: {
    spend: number;
    save: number;
    reinvest: number;
  };
  interactions: AgentInteraction[];
};

export type ActivityItem = {
  id: string;
  text: string;
  time: string;
  amount?: string;
  type?: "milestone" | "update" | "settlement";
};

export type NetworkNode = {
  id: string;
  name: string;
  ads: number;
};

export type NetworkEdge = {
  id: string;
  source: string;
  target: string;
  strength: number;
};

export type CampaignParticipant = {
  agentId: string;
  verifiedViews: number;
  adsBefore: number;
  adsAfter: number;
  cpvEfficiency: number;
  payoutUnlocked: number;
  payoutPending: number;
};

export type CampaignMilestone = {
  views: number;
  payoutPercent: number;
};

export type CampaignSettlement = {
  id: string;
  time: string;
  text: string;
  type?: "milestone" | "payout" | "update";
};

export type BlogArticle = {
  id: string;
  title: string;
  verifiedClicks: number;
  cpv: number;
};

export type Campaign = {
  id: string;
  name: string;
  objective: string;
  surface: string;
  budget: number;
  status: "Active" | "Settling" | "Complete";
  cpvModel: string;
  verifiedViews: number;
  currentCpv: number;
  unlockedPayout: number;
  totalPayout: number;
  progress: number;
  milestones: CampaignMilestone[];
  participants: CampaignParticipant[];
  settlements: CampaignSettlement[];
  blogArticles?: BlogArticle[];
};
