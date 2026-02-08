import { joinCampaignSchema, joinDigest } from "@molt/shared";
import { db } from "@/lib/db";
import { clients } from "@/lib/chain";
import { verifyRawDigestSignature } from "@/lib/signature";
import { getChainId } from "@/lib/env";
import { campaignEscrowAbi } from "@molt/shared";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ip = requestIp(req);
    const rl = rateLimit(`join:${ip}`, { limit: 120, windowMs: 60_000 });
    if (!rl.ok) {
      return jsonErr("rate limited", { status: 429, retryAfterSeconds: rl.retryAfterSeconds });
    }

    const payload = joinCampaignSchema.parse(await req.json());
    const params = await context.params;
    const campaignId = Number(params.id);

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return jsonErr("campaign not found", { status: 404 });
    }

    const agent = await db.agent.findUnique({ where: { wallet: payload.wallet } });
    if (!agent) {
      return jsonErr("agent not registered", { status: 404, hint: "Call POST /api/agents/register first." });
    }

    const { escrowAddress, relayer, relayerClient, publicClient } = clients();
    const chainId = getChainId();
    const digest = joinDigest(
      chainId,
      escrowAddress,
      campaign.chainCampaignId,
      payload.wallet as `0x${string}`,
    );

    const ok = await verifyRawDigestSignature(
      payload.wallet,
      digest,
      payload.signature as `0x${string}`,
    );
    if (!ok) {
      return jsonErr("invalid signature", {
        status: 401,
        hint:
          `Sign JOIN_CAMPAIGN as an EIP-191 raw message. ` +
          `Expected: chainId=${chainId}, escrow=${escrowAddress}, chainCampaignId=${campaign.chainCampaignId.toString()}, wallet=${payload.wallet}. ` +
          `You can fetch the exact digest at /api/digests/join?campaignId=${campaignId}&wallet=${payload.wallet}`,
      });
    }

    const txHash = await relayerClient.writeContract({
      address: escrowAddress,
      abi: campaignEscrowAbi,
      functionName: "joinCampaignFor",
      args: [campaign.chainCampaignId, payload.wallet as `0x${string}`, payload.signature as `0x${string}`],
      account: relayer,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const participant = await db.campaignParticipant.upsert({
      where: {
        campaignId_agentId: {
          campaignId,
          agentId: agent.id,
        },
      },
      create: {
        campaignId,
        agentId: agent.id,
      },
      update: {},
    });

    return jsonOk({
      participant: {
        id: participant.id,
        campaignId: participant.campaignId,
        agentWallet: agent.wallet,
        joinedAt: participant.joinedAt,
      },
      txHash,
    });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 400 });
  }
}
