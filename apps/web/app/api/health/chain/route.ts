import { jsonErr, jsonOk } from "@/lib/http";
import { getChainId, requireEnv } from "@/lib/env";

export async function GET() {
  try {
    const chainId = getChainId();
    const escrowAddress = requireEnv("ESCROW_ADDRESS");
    const rpcUrl = requireEnv("ARC_RPC_URL");

    let rpcChainId: number | null = null;
    let rpcOk = false;
    let rpcError: string | undefined;

    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });

      if (!response.ok) {
        rpcError = `RPC returned HTTP ${response.status}`;
      } else {
        const json = await response.json();
        const raw = json?.result;
        if (typeof raw === "string") {
          rpcChainId = Number(BigInt(raw));
          rpcOk = Number.isFinite(rpcChainId);
          if (!rpcOk) {
            rpcError = `Unable to parse chain id from ${raw}`;
          }
        } else {
          rpcError = "RPC response missing result";
        }
      }
    } catch (err) {
      rpcError = (err as Error).message;
    }

    return jsonOk({
      chainId,
      escrowAddress,
      rpcUrl,
      rpcChainId,
      matches: rpcChainId != null ? rpcChainId === chainId : null,
      rpcOk,
      rpcError,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return jsonErr((error as Error).message, { status: 500 });
  }
}
