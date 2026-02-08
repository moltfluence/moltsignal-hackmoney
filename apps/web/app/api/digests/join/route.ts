import { joinDigest } from "@molt/shared";
import { db } from "@/lib/db";
import { getChainId } from "@/lib/env";
import { jsonErr, jsonOk } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wallet = (url.searchParams.get("wallet") ?? "").trim();
    const campaignIdRaw = (url.searchParams.get("campaignId") ?? "").trim();
    const campaignId = Number(campaignIdRaw);

    if (!wallet || !Number.isFinite(campaignId)) {
      return jsonErr("missing wallet or campaignId", {
        status: 400,
        hint: "Usage: /api/digests/join?campaignId=1&wallet=0x...",
      });
    }

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return jsonErr("campaign not found", { status: 404 });
    }

    const escrowAddress = process.env.ESCROW_ADDRESS as `0x${string}` | undefined;
    if (!escrowAddress) {
      return jsonErr("ESCROW_ADDRESS is not configured", { status: 500 });
    }

    const chainId = getChainId();
    const digest = joinDigest(
      chainId,
      escrowAddress,
      campaign.chainCampaignId,
      wallet as `0x${string}`,
    );
    return jsonOk({
      digest,
      chainId,
      chainCampaignId: campaign.chainCampaignId.toString(),
      escrowAddress,
    });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 400 });
  }
}
