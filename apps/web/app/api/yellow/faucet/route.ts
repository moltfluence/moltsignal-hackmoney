import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";

function assertOperator(req: Request) {
  const want = process.env.OPERATOR_API_KEY ?? "";
  const got = req.headers.get("x-operator-key") ?? "";
  if (!want || got !== want) {
    throw new Error("unauthorized");
  }
}

export async function POST(req: Request) {
  try {
    assertOperator(req);

    if ((process.env.YELLOW_ENABLED ?? "false").toLowerCase() !== "true") {
      return NextResponse.json({ error: "YELLOW_ENABLED is false" }, { status: 400 });
    }

    const faucetUrl = process.env.YELLOW_FAUCET_URL ?? "https://clearnet-sandbox.yellow.com/faucet/requestTokens";
    const senderPk = requireEnv("YELLOW_SENDER_PRIVATE_KEY") as `0x${string}`;

    // Avoid parsing private keys in responses/logs; only derive the address in-memory.
    const { privateKeyToAccount } = await import("viem/accounts");
    const sender = privateKeyToAccount(senderPk);

    const res = await fetch(faucetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userAddress: sender.address }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: "faucet request failed", details: json }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sender: sender.address, response: json });
  } catch (error) {
    const msg = (error as Error).message || "error";
    const status = msg === "unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

