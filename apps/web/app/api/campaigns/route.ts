import { createCampaignSchema } from "@molt/shared";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createOnchainCampaign } from "@/lib/chain";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

function assertOperator(req: Request) {
  const want = process.env.OPERATOR_API_KEY ?? process.env.OPERATOR_KEY ?? "";
  const got = req.headers.get("x-operator-key") ?? "";
  if (!want || got !== want) {
    throw new Error("unauthorized");
  }
}

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      milestones: {
        orderBy: { orderIndex: "asc" },
        include: {
          _count: { select: { claims: true } },
        },
      },
    },
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
      milestones: c.milestones.map((m) => ({
        id: m.id,
        task: m.task,
        rewardUsdc: m.rewardUsdc,
        maxAgents: m.maxAgents,
        orderIndex: m.orderIndex,
        requiresMilestoneId: m.requiresMilestoneId,
        keywords: m.keywords,
        status: m.status,
        claimedCount: m._count.claims,
      })),
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

    // Create milestones if provided
    const milestones: Array<{ id: number; task: string; rewardUsdc: string; maxAgents: number; orderIndex: number }> = [];
    if (payload.milestones && payload.milestones.length > 0) {
      // First pass: create milestones without requires links
      const milestoneRecords = [];
      for (const ms of payload.milestones) {
        const record = await db.milestone.create({
          data: {
            campaignId: campaign.id,
            task: ms.task,
            rewardUsdc: String(ms.rewardUsdc),
            maxAgents: ms.maxAgents ?? 10,
            orderIndex: ms.orderIndex ?? 0,
            keywords: ms.keywords ? ms.keywords : Prisma.JsonNull,
            status: "OPEN",
          },
        });
        milestoneRecords.push(record);
        milestones.push({
          id: record.id,
          task: record.task,
          rewardUsdc: record.rewardUsdc,
          maxAgents: record.maxAgents,
          orderIndex: record.orderIndex,
        });
      }

      // Second pass: link requiresMilestoneId (uses index into the milestones array)
      for (let i = 0; i < payload.milestones.length; i++) {
        const reqIdx = payload.milestones[i].requiresMilestoneIndex;
        if (reqIdx !== undefined && reqIdx >= 0 && reqIdx < milestoneRecords.length) {
          await db.milestone.update({
            where: { id: milestoneRecords[i].id },
            data: { requiresMilestoneId: milestoneRecords[reqIdx].id },
          });
        }
      }
    }

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
        milestones,
      },
      txHash: onchain.txHash,
    });
  } catch (error) {
    const msg = (error as Error).message || "error";
    const status = msg === "unauthorized" ? 401 : 400;
    return jsonErr(msg, { status });
  }
}
