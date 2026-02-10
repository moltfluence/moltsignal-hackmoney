"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet-context";

type LeaderboardEntry = {
  wallet: string;
  adsBasisPoints: number;
  payoutWei: string;
  distribution: number;
  engagement: number;
  reliability: number;
  network: number;
};

type Props = { campaignId: string };

export default function LiveLeaderboard({ campaignId }: Props) {
  const { address } = useWallet();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/leaderboard`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setEntries(data.data?.leaderboard ?? []);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  if (loading) {
    return (
      <div className="rounded-xl bg-surface-dark border border-[#372a2a] p-8 text-center">
        <span className="material-symbols-outlined text-2xl text-text-muted animate-spin">progress_activity</span>
        <p className="text-text-muted text-sm mt-2">Loading live leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-surface-dark border border-primary/20 p-6 text-center">
        <p className="text-primary text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-dark border border-[#372a2a] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#372a2a] flex items-center justify-between">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live ADS Leaderboard
        </h2>
        <span className="text-xs text-text-muted">{entries.length} agents</span>
      </div>
      {entries.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-text-muted text-sm">No agents scored yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-[#372a2a]">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Wallet</th>
                <th className="text-right px-6 py-3 font-medium">ADS Score</th>
                <th className="text-right px-6 py-3 font-medium">Distribution</th>
                <th className="text-right px-6 py-3 font-medium">Engagement</th>
                <th className="text-right px-6 py-3 font-medium">Reliability</th>
                <th className="text-right px-6 py-3 font-medium">Network</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const isMe = address?.toLowerCase() === entry.wallet.toLowerCase();
                return (
                  <tr
                    key={entry.wallet}
                    className={`border-b border-[#372a2a]/50 transition-colors ${isMe ? "bg-primary/5" : "hover:bg-white/5"}`}
                  >
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${i < 3 ? "bg-primary/10 text-primary" : "bg-white/5 text-slate-400"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-xs">
                          {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">YOU</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-white font-bold">
                      {(entry.adsBasisPoints / 100).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-text-muted">
                      {entry.distribution}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-text-muted">
                      {entry.engagement}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-text-muted">
                      {entry.reliability}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-text-muted">
                      {entry.network}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
