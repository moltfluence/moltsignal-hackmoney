import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ wallet: string }> }) {
  try {
    const params = await context.params;
    const wallet = params.wallet.toLowerCase();

    const agent = await db.agent.findUnique({
      where: { wallet },
      include: {
        scoreRows: {
          include: { campaign: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      wallet: agent.wallet,
      moltbookHandle: agent.moltbookHandle,
      currentAds: agent.currentAds,
      history: agent.scoreRows.map((row) => ({
        campaignId: row.campaign.id,
        adsTotal: row.adsTotal,
        payoutWei: row.payoutWei,
        proofHash: row.proofHash,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
