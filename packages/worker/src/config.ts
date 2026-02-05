import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MOLT_AGENT_IDS,
  ORCHESTRATION_STAGES,
  type OrchestrationBinding,
  type OrchestrationConfig,
} from "./agents/types.js";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function parseOrchestrationConfig(raw: string | undefined): OrchestrationConfig | undefined {
  if (!raw || !raw.trim()) {
    return undefined;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("ORCHESTRATION_BINDINGS_JSON must be a JSON array");
  }

  const bindings: OrchestrationBinding[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const agentIdRaw = String((entry as { agentId?: unknown }).agentId ?? "").trim();
    if (!MOLT_AGENT_IDS.includes(agentIdRaw as (typeof MOLT_AGENT_IDS)[number])) {
      continue;
    }

    const matchRaw = (entry as { match?: unknown }).match;
    const match =
      matchRaw && typeof matchRaw === "object"
        ? {
            campaignId: Number.isFinite((matchRaw as { campaignId?: unknown }).campaignId)
              ? Number((matchRaw as { campaignId?: number }).campaignId)
              : undefined,
            wallet:
              typeof (matchRaw as { wallet?: unknown }).wallet === "string"
                ? ((matchRaw as { wallet: string }).wallet.toLowerCase() as `0x${string}`)
                : undefined,
            stage:
              typeof (matchRaw as { stage?: unknown }).stage === "string" &&
              ORCHESTRATION_STAGES.includes(
                (matchRaw as { stage: string }).stage as (typeof ORCHESTRATION_STAGES)[number],
              )
                ? ((matchRaw as { stage: string })
                    .stage as (typeof ORCHESTRATION_STAGES)[number])
                : undefined,
          }
        : undefined;

    bindings.push({
      agentId: agentIdRaw as (typeof MOLT_AGENT_IDS)[number],
      match,
    });
  }

  return { bindings };
}

export const config = {
  chainId: Number(process.env.ARC_CHAIN_ID ?? 5042002),
  rpcUrl: required("ARC_RPC_URL"),
  escrowAddress: required("ESCROW_ADDRESS") as `0x${string}`,
  attestorAddress: required("ATTESTOR_ADDRESS") as `0x${string}`,
  sponsorPrivateKey: required("SPONSOR_PRIVATE_KEY") as `0x${string}`,
  oraclePrivateKey: required("ORACLE_PRIVATE_KEY") as `0x${string}`,
  allowlist: (process.env.MOLTBOOK_ALLOWLIST ?? "moltbook.com,www.moltbook.com")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
  orchestration: parseOrchestrationConfig(process.env.ORCHESTRATION_BINDINGS_JSON),
  yellow: {
    enabled: (process.env.YELLOW_ENABLED ?? "false").toLowerCase() === "true",
    clearnodeWsUrl:
      process.env.YELLOW_CLEARNODE_WS_URL ?? "wss://clearnet-sandbox.yellow.com/ws",
    faucetUrl:
      process.env.YELLOW_FAUCET_URL ?? "https://clearnet-sandbox.yellow.com/faucet/requestTokens",
    assetSymbol: process.env.YELLOW_ASSET_SYMBOL ?? "ytest.usd",
    senderPrivateKey: (process.env.YELLOW_SENDER_PRIVATE_KEY ?? "") as `0x${string}`,
    payPerValidProofAtomic: BigInt(process.env.YELLOW_PAY_PER_VALID_PROOF_ATOMIC ?? "0"),
  },
  uniswapV4: {
    enabled: (process.env.UNISWAP_V4_ENABLED ?? "false").toLowerCase() === "true",
    chainId: Number(process.env.UNISWAP_V4_CHAIN_ID ?? 11155111),
    rpcUrl: process.env.UNISWAP_V4_RPC_URL ?? "",
    universalRouterAddress: (process.env.UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESS ?? "") as `0x${string}`,
    poolManagerAddress: (process.env.UNISWAP_V4_POOL_MANAGER_ADDRESS ?? "") as `0x${string}`,
    quoterAddress: (process.env.UNISWAP_V4_QUOTER_ADDRESS ?? "") as `0x${string}`,
    positionManagerAddress: (process.env.UNISWAP_V4_POSITION_MANAGER_ADDRESS ?? "") as `0x${string}`,
    permit2Address: (process.env.UNISWAP_V4_PERMIT2_ADDRESS ??
      "0x000000000022D473030F116dDEE9F6B43aC78BA3") as `0x${string}`,
  },
};
