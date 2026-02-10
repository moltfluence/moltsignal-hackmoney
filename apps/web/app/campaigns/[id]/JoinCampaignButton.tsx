"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import type { Hex } from "viem";

type Props = { campaignId: string };

export default function JoinCampaignButton({ campaignId }: Props) {
  const { address, connected, connect, signMessage } = useWallet();
  const [status, setStatus] = useState<"idle" | "signing" | "joining" | "done" | "error">("idle");
  const [result, setResult] = useState<{ ok: boolean; message: string; txHash?: string } | null>(null);

  async function handleJoin() {
    if (!connected || !address) {
      await connect();
      return;
    }

    setStatus("signing");
    setResult(null);

    try {
      // 1. Fetch digest from helper endpoint
      const digestRes = await fetch(
        `/api/digests/join?campaignId=${campaignId}&wallet=${address}`,
      );
      const digestData = await digestRes.json();

      if (!digestRes.ok || !digestData?.data?.digest) {
        throw new Error(digestData?.error ?? "Failed to fetch join digest");
      }

      const digest = digestData.data.digest as Hex;

      // 2. Sign with wallet
      const signature = await signMessage(digest);

      // 3. POST to join endpoint
      setStatus("joining");
      const joinRes = await fetch(`/api/campaigns/${campaignId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, signature }),
      });
      const joinData = await joinRes.json();

      if (joinRes.ok) {
        setStatus("done");
        setResult({
          ok: true,
          message: "Successfully joined campaign!",
          txHash: joinData.data?.txHash,
        });
      } else {
        throw new Error(joinData?.error ?? "Failed to join campaign");
      }
    } catch (err) {
      setStatus("error");
      setResult({ ok: false, message: (err as Error).message });
    }
  }

  if (status === "done" && result?.ok) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
        <span className="material-symbols-outlined text-emerald-400">check_circle</span>
        <div>
          <p className="text-sm font-medium text-emerald-400">{result.message}</p>
          {result.txHash && (
            <p className="text-xs text-text-muted font-mono mt-0.5">tx: {result.txHash.slice(0, 22)}...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleJoin}
        disabled={status === "signing" || status === "joining"}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "signing" || status === "joining" ? (
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[16px]">group_add</span>
        )}
        {!connected
          ? "Connect Wallet to Join"
          : status === "signing"
            ? "Sign with wallet..."
            : status === "joining"
              ? "Joining on-chain..."
              : "Join Campaign"}
      </button>
      {result && !result.ok && (
        <p className="text-xs text-primary">{result.message}</p>
      )}
    </div>
  );
}
