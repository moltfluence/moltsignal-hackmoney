import { campaignEscrowAbi } from "@molt/shared";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  http,
  parseAbi,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainId, requireEnv } from "./env";

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

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
  // USDC on Arc Testnet is 6 decimals (ERC-20 at 0x3600...)
  const decimals = Number(process.env.ARC_USDC_DECIMALS ?? 6);
  const budgetAtomic = parseUnits(String(budgetUsdc), decimals);
  const usdcAddress = (process.env.ARC_USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000") as `0x${string}`;

  // Step 1: Ensure the escrow contract has enough USDC allowance
  const currentAllowance = await publicClient.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [sponsor.address, escrowAddress],
  });

  if (currentAllowance < budgetAtomic) {
    // Approve a generous amount to avoid repeated approvals
    const approveAmount = budgetAtomic * 10n;
    const approveTx = await sponsorClient.writeContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrowAddress, approveAmount],
      account: sponsor,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  // Step 2: Call createCampaign with 4 args (objective, endTime, budgetUsdc, premium)
  const txHash = await sponsorClient.writeContract({
    address: escrowAddress,
    abi: campaignEscrowAbi,
    functionName: "createCampaign",
    args: [objective, endTimeSeconds, budgetAtomic, premium],
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
