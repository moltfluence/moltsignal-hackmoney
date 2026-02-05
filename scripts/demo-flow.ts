import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, defineChain, http } from "viem";
import { joinDigest, proofDigest, registerDigest } from "@molt/shared";

dotenv.config({ path: ".env" });

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
const chainId = Number(process.env.ARC_CHAIN_ID ?? 5042002);
const escrowAddress = process.env.ESCROW_ADDRESS as `0x${string}`;
const operatorApiKey = process.env.OPERATOR_API_KEY ?? "";

const postUrls = (process.env.DEMO_POST_URLS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const agentKeys = [
  process.env.AGENT_1_PRIVATE_KEY,
  process.env.AGENT_2_PRIVATE_KEY,
  process.env.AGENT_3_PRIVATE_KEY,
].filter(Boolean) as `0x${string}`[];

if (agentKeys.length < 3) {
  throw new Error("Set AGENT_1_PRIVATE_KEY, AGENT_2_PRIVATE_KEY, AGENT_3_PRIVATE_KEY in .env");
}
if (postUrls.length < 3) {
  throw new Error("Set DEMO_POST_URLS with at least 3 Moltbook URLs");
}

const chain = defineChain({
  id: chainId,
  name: "Arc Testnet",
  // Arc uses USDC as the native gas token.
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network"] },
  },
});
const rpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const campaign = await post("/api/campaigns", {
    objective: "Drive attention to MoltSignal HackMoney demo",
    budgetUsdc: "0.15",
    endTime: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    premium: false,
    yellowEnabled: true,
  });

  const campaignId: number = campaign.campaign.id;
  const chainCampaignId: bigint = BigInt(campaign.campaign.chainCampaignId);
  console.log("campaign created", campaignId, campaign.txHash);

  for (let i = 0; i < 3; i++) {
    const account = privateKeyToAccount(agentKeys[i]);
    const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
    const handle = `agent-${i + 1}`;

    const registerSig = await wallet.signMessage({
      message: { raw: registerDigest(chainId, account.address, handle) },
    });
    await post("/api/agents/register", {
      wallet: account.address,
      moltbookHandle: handle,
      signature: registerSig,
    });

    const joinSig = await wallet.signMessage({
      message: { raw: joinDigest(chainId, escrowAddress, chainCampaignId, account.address) },
    });
    await post(`/api/campaigns/${campaignId}/join`, {
      wallet: account.address,
      signature: joinSig,
    });

    const proofSig = await wallet.signMessage({
      message: { raw: proofDigest(chainId, chainCampaignId, account.address, postUrls[i]) },
    });
    await post(`/api/campaigns/${campaignId}/proofs`, {
      wallet: account.address,
      postUrl: postUrls[i],
      signature: proofSig,
    });
  }

  const settlement = await post(
    `/api/campaigns/${campaignId}/settle`,
    {},
    { "x-operator-key": operatorApiKey },
  );
  console.log("settled", settlement);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
