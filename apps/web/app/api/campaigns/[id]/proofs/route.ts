import { fetchMoltbookSnapshot, hashCanonicalJson, proofDigest, submitProofSchema } from "@molt/shared";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllowlist, getChainId } from "@/lib/env";
import { verifyRawDigestSignature } from "@/lib/signature";
import { maybePayYellowForValidProof } from "@/lib/yellow";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const campaignId = Number(params.id);
    const payload = submitProofSchema.parse(await req.json());

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "campaign not found" }, { status: 404 });
    }

    const digest = proofDigest(
      getChainId(),
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
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    const agent = await db.agent.findUnique({ where: { wallet: payload.wallet } });
    if (!agent) {
      return NextResponse.json({ error: "agent not registered" }, { status: 404 });
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
      return NextResponse.json({ error: "agent has not joined campaign" }, { status: 400 });
    }

    let snapshot;
    let valid = true;
    try {
      snapshot = await fetchMoltbookSnapshot(payload.postUrl, getAllowlist());
    } catch (error) {
      snapshot = {
        impressions: 0,
        likes: 0,
        comments: 0,
        reposts: 0,
        interactingAgents: [],
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

    return NextResponse.json({ proof });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
