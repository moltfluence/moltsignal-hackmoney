import {
  buildAgentCampaignSessionKey,
  buildAgentMainSessionKey,
  normalizeAgentId,
  normalizeWallet,
} from "./sessionKey.js";
import type {
  OrchestrationBinding,
  OrchestrationConfig,
  OrchestrationStage,
  ResolveOrchestrationRouteInput,
  ResolvedOrchestrationRoute,
} from "./types.js";

function listBindings(config?: OrchestrationConfig): OrchestrationBinding[] {
  return Array.isArray(config?.bindings) ? config.bindings : [];
}

function defaultAgentForStage(stage: OrchestrationStage) {
  switch (stage) {
    case "ingest-proofs":
      return "proof-scout" as const;
    case "compute-scores":
      return "score-engine" as const;
    case "sign-settlement":
    case "sign-attestation":
      return "oracle-signer" as const;
    case "submit-settlement":
    case "close-yellow-sessions":
      return "settlement-executor" as const;
    case "submit-erc8004-feedback":
      return "oracle-signer" as const;
    case "submit-attestation":
    case "persist-results":
      return "reputation-attestor" as const;
    default:
      return "settlement-executor" as const;
  }
}

function normalizeMatch(binding: OrchestrationBinding) {
  const campaignIdRaw = binding.match?.campaignId;
  const campaignId = Number.isFinite(campaignIdRaw) ? Number(campaignIdRaw) : undefined;
  const wallet = normalizeWallet(binding.match?.wallet);
  const stage = binding.match?.stage;
  return { campaignId, wallet, stage };
}

function matchesBinding(binding: OrchestrationBinding, input: ResolveOrchestrationRouteInput): boolean {
  const match = normalizeMatch(binding);
  const inputWallet = normalizeWallet(input.wallet);
  if (typeof match.campaignId === "number" && match.campaignId !== input.campaignId) {
    return false;
  }
  if (match.wallet && match.wallet !== inputWallet) {
    return false;
  }
  if (match.stage && match.stage !== input.stage) {
    return false;
  }
  return true;
}

function matchPriority(binding: OrchestrationBinding): number {
  const match = normalizeMatch(binding);
  let score = 0;
  if (match.wallet) score += 4;
  if (typeof match.campaignId === "number") score += 2;
  if (match.stage) score += 1;
  return score;
}

function matchedBy(binding: OrchestrationBinding): ResolvedOrchestrationRoute["matchedBy"] {
  const match = normalizeMatch(binding);
  if (match.wallet && typeof match.campaignId === "number" && match.stage) {
    return "binding.wallet.campaign.stage";
  }
  if (match.wallet && typeof match.campaignId === "number") {
    return "binding.wallet.campaign";
  }
  if (match.wallet && match.stage) {
    return "binding.wallet.stage";
  }
  if (typeof match.campaignId === "number" && match.stage) {
    return "binding.campaign.stage";
  }
  if (match.wallet) {
    return "binding.wallet";
  }
  if (typeof match.campaignId === "number") {
    return "binding.campaign";
  }
  if (match.stage) {
    return "binding.stage";
  }
  return "default.agent";
}

export function resolveOrchestrationRoute(
  input: ResolveOrchestrationRouteInput,
  config?: OrchestrationConfig,
): ResolvedOrchestrationRoute {
  const bindings = listBindings(config)
    .filter((entry) => entry && typeof entry === "object")
    .filter((entry) => matchesBinding(entry, input))
    .sort((a, b) => matchPriority(b) - matchPriority(a));

  const top = bindings[0];
  const inputWallet = normalizeWallet(input.wallet);
  const stageAgent = defaultAgentForStage(input.stage);
  const configuredDefault = config?.defaultAgentId;

  const selectedAgent = top
    ? normalizeAgentId(top.agentId)
    : configuredDefault
      ? normalizeAgentId(configuredDefault)
      : stageAgent;

  return {
    agentId: selectedAgent,
    stage: input.stage,
    campaignId: input.campaignId,
    wallet: inputWallet,
    sessionKey: buildAgentCampaignSessionKey({
      agentId: selectedAgent,
      campaignId: input.campaignId,
      stage: input.stage,
      wallet: inputWallet,
    }),
    mainSessionKey: buildAgentMainSessionKey({
      agentId: selectedAgent,
    }),
    matchedBy: top ? matchedBy(top) : configuredDefault ? "default.agent" : "default.stage",
  };
}
