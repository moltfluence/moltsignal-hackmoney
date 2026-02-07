import { campaignEscrowAbi } from "@molt/shared";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainId, requireEnv } from "./env";

function chain() {
  return defineChain({
    id: getChainId(),
    name: "Arc Testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [requireEnv("ARC_RPC_URL")] } },
  });
}

export function clients() {
  const network = chain();
  const sponsor = privateKeyToAccount(requireEnv("SPONSOR_PRIVATE_KEY") as `0x${string}`);
  const relayer = privateKeyToAccount(
    (process.env.RELAYER_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY) as `0x${string}`,
  );

  return {
    escrowAddress: requireEnv("ESCROW_ADDRESS") as `0x${string}`,
    agentRegistryAddress: (process.env.AGENT_REGISTRY_8004_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    sponsor,
    relayer,
    publicClient: createPublicClient({ chain: network, transport: http(requireEnv("ARC_RPC_URL")) }),
    sponsorClient: createWalletClient({
      account: sponsor,
      chain: network,
      transport: http(requireEnv("ARC_RPC_URL")),
    }),
    relayerClient: createWalletClient({
      account: relayer,
      chain: network,
      transport: http(requireEnv("ARC_RPC_URL")),
    }),
  };
}

export async function createOnchainCampaign(
  objective: string,
  budgetUsdc: string,
  endTimeIso: string,
  premium: boolean,
) {
  const { escrowAddress, sponsor, sponsorClient, publicClient } = clients();
  const endTimeSeconds = BigInt(Math.floor(new Date(endTimeIso).getTime() / 1000));
  const decimals = Number(process.env.ARC_USDC_DECIMALS ?? 18);
  const budgetAtomic = parseUnits(String(budgetUsdc), decimals);

  const txHash = await sponsorClient.writeContract({
    address: escrowAddress,
    abi: campaignEscrowAbi,
    functionName: "createCampaign",
    args: [objective, endTimeSeconds, premium],
    // Arc uses USDC as the native gas token (18 decimals). Funding is via msg.value.
    value: budgetAtomic,
    account: sponsor,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  let chainCampaignId = 0n;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: campaignEscrowAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "CampaignCreated") {
        chainCampaignId = decoded.args.campaignId;
        break;
      }
    } catch {
      continue;
    }
  }

  if (chainCampaignId === 0n) {
    throw new Error("unable to parse CampaignCreated event");
  }

  return {
    txHash,
    chainCampaignId,
    budgetWei: budgetAtomic.toString(),
    sponsorWallet: sponsor.address,
  };
}
