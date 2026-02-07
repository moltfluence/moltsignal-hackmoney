import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeLeaderboard } from "@/lib/scoring";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const campaignId = Number(params.id);

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        participants: { include: { agent: true } },
        proofs: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "campaign not found" }, { status: 404 });
    }

    const leaderboard = computeLeaderboard(campaign, campaign.participants, campaign.proofs);

    return NextResponse.json({
      campaignId,
      status: campaign.status,
      leaderboard,
      network: {
        description:
          "ADS v1.1 network metrics: breadth (unique actors), influence (prior ADS / reach weighted), concentration (top share) and entropy (distribution).",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
