import { registerAgentSchema } from "@molt/shared";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerDigest } from "@molt/shared";
import { getChainId } from "@/lib/env";
import { verifyRawDigestSignature } from "@/lib/signature";

export async function POST(req: Request) {
  try {
    const payload = registerAgentSchema.parse(await req.json());

    // Registration signs a deterministic digest tied to wallet + handle.
    const digest = registerDigest(getChainId(), payload.wallet as `0x${string}`, payload.moltbookHandle);
    const ok = await verifyRawDigestSignature(
      payload.wallet,
      digest,
      payload.signature as `0x${string}`,
    );
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    const agent = await db.agent.upsert({
      where: { wallet: payload.wallet },
      create: {
        wallet: payload.wallet,
        moltbookHandle: payload.moltbookHandle,
      },
      update: {
        moltbookHandle: payload.moltbookHandle,
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
