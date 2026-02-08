import { fetchMoltbookSnapshotV2, hashCanonicalJson, proofDigest, submitProofSchema } from "@molt/shared";
import { db } from "@/lib/db";
import { getAllowlist, getChainId } from "@/lib/env";
import { verifyRawDigestSignature } from "@/lib/signature";
import { maybePayYellowForValidProof } from "@/lib/yellow";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ip = requestIp(req);
    const rl = rateLimit(`proof:${ip}`, { limit: 180, windowMs: 60_000 });
    if (!rl.ok) {
      return jsonErr("rate limited", { status: 429, retryAfterSeconds: rl.retryAfterSeconds });
    }

    const params = await context.params;
    const campaignId = Number(params.id);
    const payload = submitProofSchema.parse(await req.json());

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return jsonErr("campaign not found", { status: 404 });
    }

    const chainId = getChainId();
    const digest = proofDigest(
      chainId,
      campaign.chainCampaignId,
      payload.wallet as `0x${string}`,
      payload.postUrl,
    );

    const ok = await verifyRawDigestSignature(
      payload.wallet,
      digest,
      payload.signature as `0x${string}`,
    );
    if (!ok) {
      return jsonErr("invalid signature", {
        status: 401,
        hint:
          `Sign SUBMIT_PROOF as an EIP-191 raw message. ` +
          `Expected: chainId=${chainId}, chainCampaignId=${campaign.chainCampaignId.toString()}, wallet=${payload.wallet}, postUrlHash=keccak256(postUrl). ` +
          `You can fetch the exact digest at /api/digests/proof?campaignId=${campaignId}&wallet=${payload.wallet}&postUrl=${encodeURIComponent(payload.postUrl)}`,
      });
    }

    const agent = await db.agent.findUnique({ where: { wallet: payload.wallet } });
    if (!agent) {
      return jsonErr("agent not registered", { status: 404, hint: "Call POST /api/agents/register first." });
    }

    const participant = await db.campaignParticipant.findUnique({
      where: {
        campaignId_agentId: {
          campaignId,
          agentId: agent.id,
        },
      },
    });
    if (!participant) {
      return jsonErr("agent has not joined campaign", { status: 400, hint: "Call POST /api/campaigns/:id/join first." });
    }

    let snapshot;
    let valid = true;
    try {
      const apiKey = process.env.MOLTBOOK_API_KEY ?? "";
      snapshot = await fetchMoltbookSnapshotV2(payload.postUrl, getAllowlist(), apiKey ? {
        apiKey,
        baseUrl: process.env.MOLTBOOK_API_BASE ?? "https://www.moltbook.com/api/v1",
        commentsLimit: Number(process.env.MOLTBOOK_COMMENTS_LIMIT ?? 200),
        profileLookupLimit: Number(process.env.MOLTBOOK_PROFILE_LOOKUP_LIMIT ?? 25),
        enableVotesList: (process.env.MOLTBOOK_ENABLE_VOTES_LIST ?? "false").toLowerCase() === "true",
        enableRepostsList: (process.env.MOLTBOOK_ENABLE_REPOSTS_LIST ?? "false").toLowerCase() === "true",
      } : undefined);
    } catch (error) {
      snapshot = {
        impressions: 0,
        likes: 0,
        comments: 0,
        reposts: 0,
        interactingAgents: [],
        interactions: { actors: [], totals: { uniqueActors: 0, totalSignals: 0 } },
        fetchedAt: new Date().toISOString(),
        sourceUrl: payload.postUrl,
        error: (error as Error).message,
      };
      valid = false;
    }

    const canonical = {
      wallet: payload.wallet,
      campaignId,
      snapshot,
    };
    const proofHash = hashCanonicalJson(canonical);

    const proof = await db.proofSubmission.create({
      data: {
        campaignId,
        agentId: agent.id,
        postUrl: payload.postUrl,
        claimedMetrics: payload.claimedMetrics,
        fetchedSnapshotJson: snapshot,
        proofHash,
        valid,
      },
    });

    if (valid) {
      try {
        await maybePayYellowForValidProof({
          campaignId,
          agentId: agent.id,
          agentWallet: payload.wallet as `0x${string}`,
          proofSubmissionId: proof.id,
        });
      } catch (error) {
        // Yellow micro-rewards are best-effort; proof ingestion should still succeed.
        console.warn("yellow micro-reward failed", (error as Error).message);
      }
    }

    return jsonOk({
      proof: {
        id: proof.id,
        campaignId: proof.campaignId,
        agentWallet: agent.wallet,
        postUrl: proof.postUrl,
        proofHash: proof.proofHash,
        valid: proof.valid,
        createdAt: proof.createdAt,
      },
    });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 400 });
  }
}
