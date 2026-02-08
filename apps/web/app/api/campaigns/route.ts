import { createCampaignSchema } from "@molt/shared";
import { db } from "@/lib/db";
import { createOnchainCampaign } from "@/lib/chain";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

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

  // Avoid BigInt serialization issues (chainCampaignId is BigInt).
  return jsonOk({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      chainCampaignId: c.chainCampaignId.toString(),
      sponsorWallet: c.sponsorWallet,
      objective: c.objective,
      budgetWei: c.budgetWei,
      premium: c.premium,
      yellowEnabled: c.yellowEnabled,
      minProofsPerAgent: c.minProofsPerAgent,
      endTime: c.endTime,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const ip = requestIp(req);
    const rl = rateLimit(`operator:createCampaign:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!rl.ok) {
      return jsonErr("rate limited", { status: 429, retryAfterSeconds: rl.retryAfterSeconds });
    }

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

    return jsonOk({
      campaign: {
        id: campaign.id,
        chainCampaignId: campaign.chainCampaignId.toString(),
        sponsorWallet: campaign.sponsorWallet,
        objective: campaign.objective,
        budgetWei: campaign.budgetWei,
        premium: campaign.premium,
        yellowEnabled: campaign.yellowEnabled,
        minProofsPerAgent: campaign.minProofsPerAgent,
        endTime: campaign.endTime,
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
      txHash: onchain.txHash,
    });
  } catch (error) {
    const msg = (error as Error).message || "error";
    const status = msg === "unauthorized" ? 401 : 400;
    return jsonErr(msg, { status });
  }
}
