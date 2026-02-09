import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maybePayYellowForValidProof } from "@/lib/yellow";
import { createHash } from "crypto";

// Simple hash function for proof
function hashProof(data: unknown): string {
  return "0x" + createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// Validate Moltbook URL
function validateMoltbookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("moltbook");
  } catch {
    return false;
  }
}

// Mock snapshot for hackathon demo
function createMockSnapshot(url: string) {
  return {
    url,
    impressions: Math.floor(Math.random() * 1000) + 100,
    likes: Math.floor(Math.random() * 50) + 5,
    comments: Math.floor(Math.random() * 20) + 1,
    reposts: Math.floor(Math.random() * 10),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * POST /api/work/submit
 * 
 * Submit work proof and trigger Yellow micropayment.
 * This is the "Receiver" endpoint that handles agent work submissions.
 * 
 * When an agent submits valid proof:
 * 1. Validates the proof URL
 * 2. Fetches/mocks metrics from Moltbook
 * 3. Triggers Yellow micropayment to agent's wallet
 * 4. Returns success with reward info
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, proofUrl, agentWalletAddress } = body;

    // Validate required fields
    if (!campaignId || !proofUrl || !agentWalletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: campaignId, proofUrl, agentWalletAddress" },
        { status: 400 }
      );
    }

    // Validate proof URL format
    if (!validateMoltbookUrl(proofUrl)) {
      return NextResponse.json(
        { error: "Invalid proof URL - must be a Moltbook URL" },
        { status: 400 }
      );
    }

    // Normalize wallet address
    const wallet = agentWalletAddress.toLowerCase() as `0x${string}`;

    // Find the campaign
    const campaign = await db.campaign.findUnique({
      where: { id: Number(campaignId) },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: `Campaign ${campaignId} not found` },
        { status: 404 }
      );
    }

    if (campaign.status === "SETTLED") {
      return NextResponse.json(
        { error: "Campaign already settled" },
        { status: 400 }
      );
    }

    // Find or create the agent
    let agent = await db.agent.findUnique({
      where: { wallet },
    });

    if (!agent) {
      // Auto-register agent if not exists (for hackathon demo)
      agent = await db.agent.create({
        data: {
          wallet,
          moltbookHandle: `agent_${wallet.slice(2, 8)}`,
        },
      });
    }

    // Check if agent is participant
    let participant = await db.campaignParticipant.findUnique({
      where: {
        campaignId_agentId: {
          campaignId: campaign.id,
          agentId: agent.id,
        },
      },
    });

    // Auto-join if not participant (for hackathon demo)
    if (!participant) {
      participant = await db.campaignParticipant.create({
        data: {
          campaignId: campaign.id,
          agentId: agent.id,
        },
      });
    }

    // Create mock snapshot for hackathon (replace with real fetch in production)
    const snapshot = createMockSnapshot(proofUrl);

    // Create proof hash
    const proofHash = hashProof({
      url: proofUrl,
      snapshot,
      timestamp: Date.now(),
    });

    // Store the proof submission
    const proof = await db.proofSubmission.create({
      data: {
        campaignId: campaign.id,
        agentId: agent.id,
        postUrl: proofUrl,
        fetchedSnapshotJson: snapshot,
        proofHash,
        valid: true,
      },
    });

    // Trigger Yellow micropayment if enabled
    let yellowPayment = null;
    if (campaign.yellowEnabled) {
      try {
        await maybePayYellowForValidProof({
          campaignId: campaign.id,
          agentId: agent.id,
          agentWallet: wallet,
          proofSubmissionId: proof.id,
        });
        
        // Fetch the created micro-reward
        const microReward = await db.microReward.findFirst({
          where: { proofSubmissionId: proof.id },
          orderBy: { createdAt: "desc" },
        });

        yellowPayment = microReward ? {
          amount: microReward.amount,
          tokenSymbol: microReward.tokenSymbol,
          yellowTransferId: microReward.yellowTransferId,
        } : null;

      } catch (error) {
        console.error("[/api/work/submit] Yellow payment failed:", error);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      proofId: proof.id,
      proofHash,
      agentId: agent.id,
      campaignId: campaign.id,
      snapshot,
      yellowPayment,
      message: yellowPayment 
        ? `Proof accepted! Yellow micropayment of ${yellowPayment.amount} ${yellowPayment.tokenSymbol} sent.`
        : "Proof accepted! (Yellow not enabled for this campaign)",
    });

  } catch (error) {
    console.error("[/api/work/submit] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
