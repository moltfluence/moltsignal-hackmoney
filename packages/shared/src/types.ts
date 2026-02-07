export type WalletAddress = `0x${string}`;

export type InteractionCounts = {
  comments: number;
  votes: number;
  reposts: number;
};

export type InteractionActor = {
  // Moltbook handle (stable id for the agent identity in Moltbook).
  handle: string;
  reach?: number;
  verified?: boolean;
  counts: InteractionCounts;
};

export type ProofInteractions = {
  actors: InteractionActor[];
  totals: {
    uniqueActors: number;
    totalSignals: number;
  };
};

export type AgentMetricsSnapshot = {
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  // Back-compat: older snapshots stored wallet addresses here (often empty).
  interactingAgents: WalletAddress[];
  // ADS v1.1: deterministic interaction ledger captured at ingestion time.
  interactions?: ProofInteractions;
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
  interactionActors?: InteractionActor[];
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
  networkUniqueActors: number;
  networkTopShare: number;
  networkEntropy: number;
  networkInfluence: number;
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
