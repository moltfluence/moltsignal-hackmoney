import { settleCampaign } from "@molt/worker";
import { db } from "@/lib/db";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  let campaignId: number | null = null;
  try {
    const ip = requestIp(req);
    const rl = rateLimit(`operator:settle:${ip}`, { limit: 15, windowMs: 60_000 });
    if (!rl.ok) {
      return jsonErr("rate limited", { status: 429, retryAfterSeconds: rl.retryAfterSeconds });
    }

    const key = req.headers.get("x-operator-key");
    const want = process.env.OPERATOR_API_KEY ?? process.env.OPERATOR_KEY ?? "";
    if (!key || !want || key !== want) {
      return jsonErr("unauthorized", { status: 401 });
    }

    const params = await context.params;
    campaignId = Number(params.id);

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return jsonErr("campaign not found", { status: 404 });
    }

    await db.campaign.update({ where: { id: campaignId }, data: { status: "SETTLING" } });

    const result = await settleCampaign(campaignId);

    return jsonOk({ result });
  } catch (error) {
    if (campaignId !== null) {
      await db.campaign
        .update({ where: { id: campaignId }, data: { status: "FAILED" } })
        .catch(() => undefined);
    }
    return jsonErr((error as Error).message, { status: 400 });
  }
}
