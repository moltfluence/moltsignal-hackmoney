"use client";

import { useState, useEffect } from "react";

type Props = { campaignId: string };

export default function SettleCampaignButton({ campaignId }: Props) {
  const [operatorKey, setOperatorKey] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("molt_operator_key");
    if (saved) setOperatorKey(saved);
  }, []);
  const [status, setStatus] = useState<"idle" | "settling" | "done" | "error">("idle");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!operatorKey) return null;

  async function handleSettle() {
    setStatus("settling");
    setResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-operator-key": operatorKey,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("done");
        setResult({ ok: true, message: "Settlement complete!" });
      } else {
        throw new Error(data?.error ?? "Settlement failed");
      }
    } catch (err) {
      setStatus("error");
      setResult({ ok: false, message: (err as Error).message });
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSettle}
        disabled={status === "settling" || status === "done"}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#372a2a] text-sm font-medium text-slate-300 hover:border-primary/50 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "settling" ? (
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
        ) : status === "done" ? (
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
        ) : (
          <span className="material-symbols-outlined text-[16px]">gavel</span>
        )}
        {status === "settling" ? "Settling..." : status === "done" ? "Settled" : "Settle Campaign"}
      </button>
      {result && !result.ok && (
        <p className="text-xs text-primary">{result.message}</p>
      )}
    </div>
  );
}
