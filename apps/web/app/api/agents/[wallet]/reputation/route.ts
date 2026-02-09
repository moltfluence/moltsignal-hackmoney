import { db } from "@/lib/db";
import { jsonErr, jsonOk } from "@/lib/http";

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
      return jsonErr("agent not found", { status: 404 });
    }

    return jsonOk({
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
    return jsonErr((error as Error).message, { status: 400 });
  }
}
