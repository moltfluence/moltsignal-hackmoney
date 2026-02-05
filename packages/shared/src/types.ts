export type WalletAddress = `0x${string}`;

export type AgentMetricsSnapshot = {
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  interactingAgents: WalletAddress[];
  fetchedAt: string;
  sourceUrl: string;
  title?: string;
};

export type AgentScoreInput = {
  wallet: WalletAddress;
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  interactingAgents: WalletAddress[];
  validProofs: number;
  invalidProofs: number;
  expectedProofs: number;
};

export type AgentScoreBreakdown = {
  wallet: WalletAddress;
  distribution: number;
  engagement: number;
  reliability: number;
  network: number;
  adsBasisPoints: number;
  payoutWei: bigint;
};

export type SettlementRow = {
  agent: WalletAddress;
  payoutWei: bigint;
  adsScore: number;
  proofHash: `0x${string}`;
};

export type AttestationRow = {
  agent: WalletAddress;
  adsDelta: number;
  adsAfter: number;
  metricsHash: `0x${string}`;
};
