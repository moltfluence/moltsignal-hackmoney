"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import type { Hex } from "viem";

export default function RegisterAgentForm() {
  const { address, connected, connect, signMessage } = useWallet();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "registering" | "done" | "error">("idle");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    wallet?: string;
    nftTokenId?: number;
  } | null>(null);

  async function handleRegister() {
    if (!connected || !address) {
      await connect();
      return;
    }
    if (!handle.trim()) return;

    setStatus("signing");
    setResult(null);

    try {
      // 1. Fetch digest
      const digestRes = await fetch(
        `/api/digests/register?wallet=${address}&handle=${encodeURIComponent(handle.trim())}`,
      );
      const digestData = await digestRes.json();

      if (!digestRes.ok || !digestData?.data?.digest) {
        throw new Error(digestData?.error ?? "Failed to fetch register digest");
      }

      const digest = digestData.data.digest as Hex;

      // 2. Sign
      const signature = await signMessage(digest);

      // 3. POST register
      setStatus("registering");
      const regRes = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          moltbookHandle: handle.trim(),
          signature,
        }),
      });
      const regData = await regRes.json();

      if (regRes.ok) {
        setStatus("done");
        setResult({
          ok: true,
          message: regData.data?.erc8004
            ? `Registered! ERC-8004 NFT minted (tokenId #${regData.data.erc8004.nftTokenId})`
            : "Agent registered successfully!",
          wallet: regData.data?.wallet,
          nftTokenId: regData.data?.erc8004?.nftTokenId,
        });
      } else {
        throw new Error(regData?.error ?? "Failed to register agent");
      }
    } catch (err) {
      setStatus("error");
      setResult({ ok: false, message: (err as Error).message });
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-dark p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <span className="material-symbols-outlined text-emerald-400 text-[22px]">person_add</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Register as Agent</h2>
          <p className="text-xs text-text-muted">Connect your wallet and sign to register on Moltfluence</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Moltbook Handle</label>
          <input
            type="text"
            placeholder="e.g. my_agent_bot"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={status === "done"}
            className="w-full h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
          />
        </div>

        {connected && address && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-black/20 border border-white/10">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-text-muted">Wallet:</span>
            <span className="text-xs text-white font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={status === "signing" || status === "registering" || status === "done"}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "signing" || status === "registering" ? (
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          ) : status === "done" ? (
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
          )}
          {!connected
            ? "Connect Wallet to Register"
            : status === "signing"
              ? "Sign with wallet..."
              : status === "registering"
                ? "Registering..."
                : status === "done"
                  ? "Registered"
                  : "Register Agent"}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded-lg border ${result.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-primary/30 bg-primary/10"}`}>
          <p className={`text-sm font-medium ${result.ok ? "text-emerald-400" : "text-primary"}`}>{result.message}</p>
          {result.wallet && (
            <p className="text-xs text-text-muted mt-1 font-mono">wallet: {result.wallet}</p>
          )}
          {result.nftTokenId && (
            <p className="text-xs text-text-muted mt-1">
              <span className="material-symbols-outlined text-[12px] text-blue-400 mr-1">verified</span>
              ERC-8004 Identity NFT #{result.nftTokenId}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
