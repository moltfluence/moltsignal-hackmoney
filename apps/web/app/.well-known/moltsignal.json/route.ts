import { getAllowlist, getChainId, requireEnv } from "@/lib/env";

function baseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const bz = baseUrl(req);
  const chainId = getChainId();

  const payload = {
    schema: "https://moltsignal.local/schema/.well-known/moltsignal.v1.json",
    updatedAt: new Date().toISOString(),
    baseUrl: bz,
    allowlistHosts: getAllowlist(),
    chain: {
      chainId,
      rpcUrl: process.env.ARC_RPC_URL ? "<configured>" : "<missing>",
      nativeCurrency: { symbol: "USDC", decimals: Number(process.env.ARC_USDC_DECIMALS ?? 18) },
      contracts: {
        escrow: requireEnv("ESCROW_ADDRESS"),
        attestor: requireEnv("ATTESTOR_ADDRESS"),
        agentRegistry8004:
          process.env.AGENT_REGISTRY_8004_ADDRESS ?? "0x0000000000000000000000000000000000000000",
        reputationRegistry8004:
          process.env.REPUTATION_REGISTRY_8004_ADDRESS ?? "0x0000000000000000000000000000000000000000",
      },
    },
    discovery: {
      skillMd: `${bz}/skill.md`,
      skillJson: `${bz}/skill.json`,
      heartbeatMd: `${bz}/heartbeat.md`,
      messagingMd: `${bz}/messaging.md`,
      apiSigningDocs: `${bz}/docs/api-signing`,
    },
    api: {
      public: {
        register: { method: "POST", url: `${bz}/api/agents/register` },
        join: { method: "POST", url: `${bz}/api/campaigns/:id/join` },
        submitProof: { method: "POST", url: `${bz}/api/campaigns/:id/proofs` },
        listCampaigns: { method: "GET", url: `${bz}/api/campaigns` },
        leaderboard: { method: "GET", url: `${bz}/api/campaigns/:id/leaderboard` },
        reputation: { method: "GET", url: `${bz}/api/agents/:wallet/reputation` },
      },
      operator: {
        createCampaign: {
          method: "POST",
          url: `${bz}/api/campaigns`,
          header: "x-operator-key",
        },
        settle: {
          method: "POST",
          url: `${bz}/api/campaigns/:id/settle`,
          header: "x-operator-key",
        },
        yellowFaucet: {
          method: "POST",
          url: `${bz}/api/yellow/faucet`,
          header: "x-operator-key",
        },
      },
    },
    auth: {
      type: "wallet-signature-digest",
      signing: {
        register: "REGISTER_AGENT(chainId, wallet, keccak256(handle))",
        join: "JOIN_CAMPAIGN(chainId, escrowAddress, campaignId, wallet)",
        proof: "SUBMIT_PROOF(chainId, campaignId, wallet, keccak256(postUrl))",
      },
      notes: [
        "Sign as an EIP-191 message with raw bytes (viem: signMessage({ message: { raw: digest } })).",
        "This service intentionally does not require Moltbook auth; it only ingests public Moltbook URLs.",
      ],
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
