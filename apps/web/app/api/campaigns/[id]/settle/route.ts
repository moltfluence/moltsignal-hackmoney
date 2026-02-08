import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { db } from "@/lib/db";
import { jsonErr, jsonOk, requestIp } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

const execFileAsync = promisify(execFile);

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

    const cwd = process.cwd();
    const guessedRoot =
      existsSync(resolve(cwd, "pnpm-workspace.yaml")) ? cwd : resolve(cwd, "../..");
    const workspaceRoot = process.env.MONO_ROOT ?? guessedRoot;
    const { stdout } = await execFileAsync(
      "pnpm",
      ["--filter", "@molt/worker", "--silent", "run", "settle", "--", String(campaignId)],
      { cwd: workspaceRoot },
    );

    const result = (() => {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return { raw: stdout.trim() };
      }
    })();

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
