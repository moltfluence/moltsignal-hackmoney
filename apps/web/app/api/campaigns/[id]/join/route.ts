import { joinCampaignSchema, joinDigest } from "@molt/shared";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/chain";
import { verifyRawDigestSignature } from "@/lib/signature";
import { getChainId } from "@/lib/env";
import { campaignEscrowAbi } from "@molt/shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = joinCampaignSchema.parse(await req.json());
    const params = await context.params;
    const campaignId = Number(params.id);

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "campaign not found" }, { status: 404 });
    }

    const agent = await db.agent.findUnique({ where: { wallet: payload.wallet } });
    if (!agent) {
      return NextResponse.json({ error: "agent not registered" }, { status: 404 });
    }

    const { escrowAddress, relayer, relayerClient, publicClient } = clients();
    const digest = joinDigest(
      getChainId(),
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
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
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

    return NextResponse.json({ participant, txHash });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
