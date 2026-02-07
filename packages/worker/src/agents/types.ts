export const MOLT_AGENT_IDS = [
  "proof-scout",
  "score-engine",
  "oracle-signer",
  "settlement-executor",
  "reputation-attestor",
] as const;

export type MoltAgentId = (typeof MOLT_AGENT_IDS)[number];

export const ORCHESTRATION_STAGES = [
  "ingest-proofs",
  "compute-scores",
  "sign-settlement",
  "submit-settlement",
  "close-yellow-sessions",
  "sign-attestation",
  "submit-attestation",
  "submit-erc8004-feedback",
  "persist-results",
] as const;

export type OrchestrationStage = (typeof ORCHESTRATION_STAGES)[number];

export type OrchestrationBindingMatch = {
  campaignId?: number;
  wallet?: `0x${string}`;
  stage?: OrchestrationStage;
};

export type OrchestrationBinding = {
  agentId: MoltAgentId;
  match?: OrchestrationBindingMatch;
};

export type OrchestrationConfig = {
  defaultAgentId?: MoltAgentId;
  bindings?: OrchestrationBinding[];
};

export type ResolveOrchestrationRouteInput = {
  campaignId: number;
  stage: OrchestrationStage;
  wallet?: `0x${string}` | null;
};

export type ResolvedOrchestrationRoute = {
  agentId: MoltAgentId;
  stage: OrchestrationStage;
  campaignId: number;
  wallet?: `0x${string}`;
  sessionKey: string;
  mainSessionKey: string;
  matchedBy:
    | "binding.wallet.campaign.stage"
    | "binding.wallet.campaign"
    | "binding.wallet.stage"
    | "binding.campaign.stage"
    | "binding.wallet"
    | "binding.campaign"
    | "binding.stage"
    | "default.stage"
    | "default.agent";
};

export type StageTrace = {
  stage: OrchestrationStage;
  agentId: MoltAgentId;
  sessionKey: string;
  matchedBy: ResolvedOrchestrationRoute["matchedBy"];
  startedAt: string;
  endedAt: string;
  durationMs: number;
};
