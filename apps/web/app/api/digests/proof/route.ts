import { proofDigest } from "@molt/shared";
import { db } from "@/lib/db";
import { getChainId } from "@/lib/env";
import { jsonErr, jsonOk } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wallet = (url.searchParams.get("wallet") ?? "").trim();
    const campaignIdRaw = (url.searchParams.get("campaignId") ?? "").trim();
    const postUrl = (url.searchParams.get("postUrl") ?? "").trim();
    const campaignId = Number(campaignIdRaw);

    if (!wallet || !postUrl || !Number.isFinite(campaignId)) {
      return jsonErr("missing wallet, postUrl, or campaignId", {
        status: 400,
        hint: "Usage: /api/digests/proof?campaignId=1&wallet=0x...&postUrl=https%3A%2F%2Fwww.moltbook.com%2F...",
      });
    }

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return jsonErr("campaign not found", { status: 404 });
    }

    const chainId = getChainId();
    const digest = proofDigest(
      chainId,
      campaign.chainCampaignId,
      wallet as `0x${string}`,
      postUrl,
    );

    return jsonOk({
      digest,
      chainId,
      chainCampaignId: campaign.chainCampaignId.toString(),
      postUrl,
    });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 400 });
  }
}
