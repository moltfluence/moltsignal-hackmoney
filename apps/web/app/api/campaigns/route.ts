import { createCampaignSchema } from "@molt/shared";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOnchainCampaign } from "@/lib/chain";

function assertOperator(req: Request) {
  const want = process.env.OPERATOR_API_KEY ?? "";
  const got = req.headers.get("x-operator-key") ?? "";
  if (!want || got !== want) {
    throw new Error("unauthorized");
  }
}

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  try {
    // Campaign creation spends the server's sponsor key; keep it operator-only.
    assertOperator(req);

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
        minProofsPerAgent: payload.minProofsPerAgent ?? 1,
        endTime,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      campaign,
      txHash: onchain.txHash,
    });
  } catch (error) {
    const msg = (error as Error).message || "error";
    const status = msg === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
