import { db } from "@/lib/db";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

function assertOperator(req: Request) {
  const want = process.env.OPERATOR_API_KEY ?? process.env.OPERATOR_KEY ?? "";
  const got = req.headers.get("x-operator-key") ?? "";
  if (!want || got !== want) {
    throw new Error("unauthorized");
  }
}

/**
 * POST /api/campaigns/:id/force-join
 *
 * Force-join all registered agents to a campaign.
 * Requires operator API key. Used for demos to ensure all agents
 * are participating and not sitting idle.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ip = requestIp(req);
    const rl = rateLimit(`forceJoin:${ip}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return jsonErr("rate limited", { status: 429, retryAfterSeconds: rl.retryAfterSeconds });
    }

    assertOperator(req);

    const params = await context.params;
    const campaignId = Number(params.id);

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return jsonErr("campaign not found", { status: 404 });
    }

    if (campaign.status !== "ACTIVE") {
      return jsonErr("campaign is not active", { status: 400 });
    }

    // Get all registered agents
    const agents = await db.agent.findMany();
    if (agents.length === 0) {
      return jsonErr("no agents registered", { status: 404 });
    }

    // Get existing participants
    const existingParticipants = await db.campaignParticipant.findMany({
      where: { campaignId },
      select: { agentId: true },
    });
    const existingAgentIds = new Set(existingParticipants.map((p) => p.agentId));

    // Join agents that haven't already joined
    const newParticipants: Array<{ agentId: number; wallet: string; handle: string }> = [];
    for (const agent of agents) {
      if (!existingAgentIds.has(agent.id)) {
        await db.campaignParticipant.create({
          data: {
            campaignId,
            agentId: agent.id,
          },
        });
        newParticipants.push({
          agentId: agent.id,
          wallet: agent.wallet,
          handle: agent.moltbookHandle,
        });
      }
    }

    return jsonOk({
      campaignId,
      totalAgents: agents.length,
      alreadyJoined: existingAgentIds.size,
      newlyJoined: newParticipants.length,
      participants: newParticipants,
    });
  } catch (error) {
    const msg = (error as Error).message || "error";
    const status = msg === "unauthorized" ? 401 : 400;
    return jsonErr(msg, { status });
  }
}
