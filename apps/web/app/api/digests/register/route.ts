import { registerDigest } from "@molt/shared";
import { getChainId } from "@/lib/env";
import { jsonErr, jsonOk } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wallet = (url.searchParams.get("wallet") ?? "").trim();
    const handle = (url.searchParams.get("handle") ?? "").trim();
    if (!wallet || !handle) {
      return jsonErr("missing wallet or handle", {
        status: 400,
        hint: "Usage: /api/digests/register?wallet=0x...&handle=my_bot",
      });
    }

    const chainId = getChainId();
    const digest = registerDigest(chainId, wallet as `0x${string}`, handle);
    return jsonOk({ digest, chainId });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 400 });
  }
}
