import type { MoltAgentId, OrchestrationStage } from "./types";

export const DEFAULT_MAIN_KEY = "main";
export const DEFAULT_AGENT_ID: MoltAgentId = "settlement-executor";

const VALID_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const INVALID_CHARS_RE = /[^a-z0-9_-]+/g;
const LEADING_DASH_RE = /^-+/;
const TRAILING_DASH_RE = /-+$/;

function normalizeToken(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeAgentId(value: string | undefined | null): MoltAgentId {
  const normalized = sanitizeAgentId(value);
  switch (normalized) {
    case "proof-scout":
    case "score-engine":
    case "oracle-signer":
    case "settlement-executor":
    case "reputation-attestor":
      return normalized;
    default:
      return DEFAULT_AGENT_ID;
  }
}

export function sanitizeAgentId(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return DEFAULT_AGENT_ID;
  }
  if (VALID_ID_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return (
    trimmed
      .toLowerCase()
      .replace(INVALID_CHARS_RE, "-")
      .replace(LEADING_DASH_RE, "")
      .replace(TRAILING_DASH_RE, "")
      .slice(0, 64) || DEFAULT_AGENT_ID
  );
}

export function normalizeWallet(value: string | undefined | null): `0x${string}` | undefined {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }
  if (!/^0x[a-f0-9]{40}$/.test(trimmed)) {
    return undefined;
  }
  return trimmed as `0x${string}`;
}

export function buildAgentMainSessionKey(params: {
  agentId: MoltAgentId;
  mainKey?: string;
}): string {
  const mainKey = normalizeToken(params.mainKey) || DEFAULT_MAIN_KEY;
  return `agent:${normalizeAgentId(params.agentId)}:${mainKey}`;
}

export function buildAgentCampaignSessionKey(params: {
  agentId: MoltAgentId;
  campaignId: number;
  stage: OrchestrationStage;
  wallet?: `0x${string}` | null;
}): string {
  const base = `agent:${normalizeAgentId(params.agentId)}:campaign:${params.campaignId}:stage:${normalizeToken(params.stage)}`;
  const wallet = normalizeWallet(params.wallet);
  if (!wallet) {
    return base;
  }
  return `${base}:wallet:${wallet}`;
}
