import { type AgentMetricsSnapshot, fetchMoltbookSnapshotV2, hashCanonicalJson, proofDigest, submitProofSchema } from "@molt/shared";
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

    // --- Signature Verification ---
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

    // --- Agent Registration Check ---
    const agent = await db.agent.findUnique({ where: { wallet: payload.wallet } });
    if (!agent) {
      return jsonErr("agent not registered", { status: 404, hint: "Call POST /api/agents/register first." });
    }

    // --- Participation Check ---
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

    // --- Duplicate URL Check ---
    const existingProof = await db.proofSubmission.findFirst({
      where: {
        campaignId,
        postUrl: payload.postUrl,
        valid: true,
      },
    });
    if (existingProof) {
      return jsonErr("proof URL already submitted for this campaign", {
        status: 409,
        hint: "Each post URL can only be submitted once per campaign.",
      });
    }

    // --- Milestone Capacity Check (if milestoneId provided) ---
    let milestone: { id: number; task: string; rewardUsdc: string; maxAgents: number; keywords: unknown; status: string } | null = null;
    if (payload.milestoneId) {
      const ms = await db.milestone.findUnique({
        where: { id: payload.milestoneId },
        include: { _count: { select: { claims: true } } },
      });
      if (!ms) {
        return jsonErr("milestone not found", { status: 404 });
      }
      if (ms.campaignId !== campaignId) {
        return jsonErr("milestone does not belong to this campaign", { status: 400 });
      }
      if (ms.status !== "OPEN") {
        return jsonErr("milestone is not open", { status: 400 });
      }
      if (ms._count.claims >= ms.maxAgents) {
        return jsonErr("milestone fully claimed", {
          status: 409,
          hint: `This milestone allows max ${ms.maxAgents} agents. All slots are taken.`,
        });
      }
      // Check if this agent already claimed this milestone
      const existingClaim = await db.milestoneClaim.findUnique({
        where: { milestoneId_agentId: { milestoneId: ms.id, agentId: agent.id } },
      });
      if (existingClaim) {
        return jsonErr("you already claimed this milestone", { status: 409 });
      }
      milestone = ms;
    }

    // --- Fetch Moltbook Snapshot (with author + content) ---
    let snapshot: AgentMetricsSnapshot;
    let valid = true;
    const verificationErrors: string[] = [];
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
        interactingAgents: [] as `0x${string}`[],
        interactions: { actors: [], totals: { uniqueActors: 0, totalSignals: 0 } },
        fetchedAt: new Date().toISOString(),
        sourceUrl: payload.postUrl,
      } satisfies AgentMetricsSnapshot;
      valid = false;
      verificationErrors.push(`fetch_error: ${(error as Error).message}`);
    }

    // --- Author Verification ---
    if (valid && snapshot.authorHandle) {
      const postAuthor = snapshot.authorHandle.trim().toLowerCase();
      const agentHandle = agent.moltbookHandle.trim().toLowerCase();
      if (postAuthor !== agentHandle) {
        valid = false;
        verificationErrors.push(
          `author_mismatch: post author "${postAuthor}" does not match agent handle "${agentHandle}"`
        );
      }
    }

    // --- Keyword Check ---
    // Check campaign objective keywords and milestone-specific keywords
    if (valid && snapshot.content) {
      const contentLower = snapshot.content.toLowerCase();

      // Check milestone-specific keywords if present
      if (milestone?.keywords) {
        const msKeywords = Array.isArray(milestone.keywords)
          ? (milestone.keywords as string[])
          : [];
        if (msKeywords.length > 0) {
          const missing = msKeywords.filter((kw) => !contentLower.includes(kw.toLowerCase()));
          if (missing.length > 0) {
            valid = false;
            verificationErrors.push(
              `keyword_missing: post must contain keywords: ${missing.join(", ")}`
            );
          }
        }
      }

      // Fallback: extract keywords from campaign objective for basic relevance check
      if (valid) {
        const objectiveWords = campaign.objective
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 5);
        if (objectiveWords.length > 0) {
          const matchCount = objectiveWords.filter((w) => contentLower.includes(w)).length;
          // Require at least 1 keyword match from objective for relevance
          if (matchCount === 0) {
            // Soft warning - don't reject, just note it
            verificationErrors.push(
              `keyword_relevance_warning: post may not be relevant to campaign objective`
            );
          }
        }
      }
    }

    // --- Create Proof ---
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
        milestoneId: milestone?.id ?? null,
        postUrl: payload.postUrl,
        claimedMetrics: payload.claimedMetrics,
        fetchedSnapshotJson: {
          ...snapshot,
          verificationErrors: verificationErrors.length > 0 ? verificationErrors : undefined,
        },
        proofHash,
        valid,
      },
    });

    // --- Milestone Claim (if valid and milestone specified) ---
    let milestoneClaimResult: { milestoneId: number; rewardUsdc: string } | undefined;
    if (valid && milestone) {
      await db.milestoneClaim.create({
        data: {
          milestoneId: milestone.id,
          agentId: agent.id,
          proofSubmissionId: proof.id,
          status: "APPROVED",
        },
      });

      // Check if milestone is now full
      const claimCount = await db.milestoneClaim.count({
        where: { milestoneId: milestone.id },
      });
      if (claimCount >= milestone.maxAgents) {
        await db.milestone.update({
          where: { id: milestone.id },
          data: { status: "FULL" },
        });
      }

      milestoneClaimResult = {
        milestoneId: milestone.id,
        rewardUsdc: milestone.rewardUsdc,
      };
    }

    // --- Yellow Micropayment ---
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
        milestoneId: proof.milestoneId,
        milestoneClaim: milestoneClaimResult,
        verificationErrors: verificationErrors.length > 0 ? verificationErrors : undefined,
        createdAt: proof.createdAt,
      },
    });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 400 });
  }
}
