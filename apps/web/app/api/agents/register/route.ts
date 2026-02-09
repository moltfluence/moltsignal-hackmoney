import { registerAgentSchema, agentRegistry8004Abi } from "@molt/shared";
import { decodeEventLog } from "viem";
import { db } from "@/lib/db";
import { registerDigest } from "@molt/shared";
import { getChainId } from "@/lib/env";
import { verifyRawDigestSignature } from "@/lib/signature";
import { clients } from "@/lib/chain";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = requestIp(req);
    const rl = rateLimit(`register:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!rl.ok) {
      return jsonErr("rate limited", { status: 429, retryAfterSeconds: rl.retryAfterSeconds });
    }

    const payload = registerAgentSchema.parse(await req.json());
    const wallet = payload.wallet as `0x${string}`;

    // Registration signs a deterministic digest tied to wallet + handle.
    const chainId = getChainId();
    const digest = registerDigest(chainId, wallet, payload.moltbookHandle);
    const ok = await verifyRawDigestSignature(
      wallet,
      digest,
      payload.signature as `0x${string}`,
    );
    if (!ok) {
      return jsonErr("invalid signature", {
        status: 401,
        hint:
          `Sign REGISTER_AGENT as an EIP-191 raw message. ` +
          `Expected: chainId=${chainId}, wallet=${payload.wallet}, handle=${payload.moltbookHandle}. ` +
          `You can fetch the exact digest at /api/digests/register?wallet=${payload.wallet}&handle=${encodeURIComponent(payload.moltbookHandle)}`,
      });
    }

    // Attempt ERC-8004 on-chain registration (non-blocking — off-chain upsert still succeeds)
    let nftTokenId: bigint | undefined;
    let agentUri: string | undefined;
    const { agentRegistryAddress, relayerClient, relayer, publicClient } = clients();
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    if (agentRegistryAddress !== zeroAddress) {
      try {
        const json = JSON.stringify({ name: payload.moltbookHandle, wallet: payload.wallet });
        agentUri = `data:application/json,${encodeURIComponent(json)}`;
        const txHash = await relayerClient.writeContract({
          address: agentRegistryAddress,
          abi: agentRegistry8004Abi,
          functionName: "registerFor",
          args: [wallet, payload.moltbookHandle, agentUri, payload.signature as `0x${string}`],
          account: relayer,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({ abi: agentRegistry8004Abi, data: log.data, topics: log.topics });
            if (decoded.eventName === "Registered") {
              nftTokenId = decoded.args.agentId;
              break;
            }
          } catch {
            continue;
          }
        }
      } catch (err) {
        console.error("[register] ERC-8004 mint failed (non-fatal):", err);
      }
    }

    const agent = await db.agent.upsert({
      where: { wallet: payload.wallet },
      create: {
        wallet: payload.wallet,
        moltbookHandle: payload.moltbookHandle,
        registrationSig: payload.signature,
        ...(nftTokenId != null ? { nftTokenId, agentUri } : {}),
      },
      update: {
        moltbookHandle: payload.moltbookHandle,
        registrationSig: payload.signature,
        ...(nftTokenId != null ? { nftTokenId, agentUri } : {}),
      },
    });

    // Do not return raw Prisma model (may contain BigInt fields).
    return jsonOk({
      wallet: agent.wallet,
      moltbookHandle: agent.moltbookHandle,
      createdAt: agent.createdAt,
      circle: null,
      erc8004: nftTokenId != null ? { nftTokenId: nftTokenId.toString(), agentUri } : null,
    });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 400 });
  }
}
