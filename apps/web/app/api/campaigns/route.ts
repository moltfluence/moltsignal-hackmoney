import { createCampaignSchema } from "@molt/shared";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOnchainCampaign } from "@/lib/chain";

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  try {
    const payload = createCampaignSchema.parse(await req.json());
    const endTime = new Date(payload.endTime);

    const onchain = await createOnchainCampaign(
      payload.objective,
      String(payload.budgetUsdc),
      payload.endTime,
      payload.premium,
    );

    const campaign = await db.campaign.create({
      data: {
        chainCampaignId: onchain.chainCampaignId,
        sponsorWallet: onchain.sponsorWallet,
        objective: payload.objective,
        budgetWei: onchain.budgetWei,
        premium: payload.premium,
        yellowEnabled: payload.yellowEnabled,
        endTime,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      campaign,
      txHash: onchain.txHash,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
