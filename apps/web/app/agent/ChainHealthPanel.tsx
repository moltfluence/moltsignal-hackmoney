'use client';

import { useEffect, useState } from "react";

type ChainHealth = {
  chainId: number;
  rpcUrl: string;
  rpcChainId: number | null;
  matches: boolean | null;
  escrowAddress: string;
  rpcOk: boolean;
  rpcError?: string;
  timestamp: string;
};

const initialState: ChainHealth | null = null;

function statusBadge(ok?: boolean | null) {
  if (ok === undefined || ok === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
        <span className="material-symbols-outlined text-[14px]">help</span>
        Unknown
      </span>
    );
  }
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Matching
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
      <span className="material-symbols-outlined text-[14px]">error</span>
      Mismatch
    </span>
  );
}

export function ChainHealthPanel() {
  const [health, setHealth] = useState<ChainHealth | null>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/health/chain", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as ChainHealth;
        if (!cancelled) {
          setHealth(json);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("chain health fetch failed", err);
          setHealth(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const chainId = health?.chainId ?? "?";
  const rpcUrl = health?.rpcUrl ?? "(missing)";
  const rpcChainId = health?.rpcChainId ?? "?";
  const rpcStatus = loading ? "Checking..." : health?.rpcOk ? "RPC reachable" : health?.rpcError ?? "";
  const escrowAddress = health?.escrowAddress ?? "(not set)";
  const badge = loading ? statusBadge(null) : statusBadge(health?.matches ?? null);

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div className="rounded-xl border border-white/10 bg-background-dark p-4">
        <p className="text-text-muted uppercase tracking-wide text-xs font-bold">Configured chain id</p>
        <p className="text-white text-lg font-semibold mt-1">{chainId}</p>
        <p className="text-xs text-text-muted mt-1 break-all">RPC: {rpcUrl}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-background-dark p-4">
        <p className="text-text-muted uppercase tracking-wide text-xs font-bold">RPC answered</p>
        <p className="text-white text-lg font-semibold mt-1">{rpcChainId}</p>
        <p className="text-xs text-text-muted mt-1">{rpcStatus}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-background-dark p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-text-muted uppercase tracking-wide text-xs font-bold">Escrow</p>
          {badge}
        </div>
        <p className="text-xs text-text-muted break-all">{escrowAddress}</p>
      </div>
    </div>
  );
}
