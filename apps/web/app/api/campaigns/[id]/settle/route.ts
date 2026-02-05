import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { db } from "@/lib/db";

const execFileAsync = promisify(execFile);

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  let campaignId: number | null = null;
  try {
    const key = req.headers.get("x-operator-key");
    if (!key || key !== process.env.OPERATOR_API_KEY) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    campaignId = Number(params.id);

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: "campaign not found" }, { status: 404 });
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

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (campaignId !== null) {
      await db.campaign
        .update({ where: { id: campaignId }, data: { status: "FAILED" } })
        .catch(() => undefined);
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
