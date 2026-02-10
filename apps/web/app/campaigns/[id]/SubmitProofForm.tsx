"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import type { Hex } from "viem";

type Props = { campaignId: string };

export default function SubmitProofForm({ campaignId }: Props) {
  const { address, connected, connect, signMessage } = useWallet();
  const [postUrl, setPostUrl] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"idle" | "signing" | "submitting" | "done" | "error">("idle");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    proofId?: number;
    valid?: boolean;
    warnings?: string[];
  } | null>(null);

  async function handleSubmit() {
    if (!connected || !address) {
      await connect();
      return;
    }
    if (!postUrl) return;

    setStatus("signing");
    setResult(null);

    try {
      // 1. Fetch digest
      const digestRes = await fetch(
        `/api/digests/proof?campaignId=${campaignId}&wallet=${address}&postUrl=${encodeURIComponent(postUrl)}`,
      );
      const digestData = await digestRes.json();

      if (!digestRes.ok || !digestData?.data?.digest) {
        throw new Error(digestData?.error ?? "Failed to fetch proof digest");
      }

      const digest = digestData.data.digest as Hex;

      // 2. Sign
      const signature = await signMessage(digest);

      // 3. POST proof
      setStatus("submitting");
      const proofRes = await fetch(`/api/campaigns/${campaignId}/proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, postUrl, signature }),
      });
      const proofData = await proofRes.json();

      if (proofRes.ok) {
        const p = proofData.data?.proof;
        setStatus("done");
        setResult({
          ok: true,
          message: `Proof #${p?.id} submitted${p?.valid ? " (valid)" : " (pending verification)"}`,
          proofId: p?.id,
          valid: p?.valid,
          warnings: p?.verificationErrors,
        });
        setPostUrl("");
      } else {
        throw new Error(proofData?.error ?? "Failed to submit proof");
      }
    } catch (err) {
      setStatus("error");
      setResult({ ok: false, message: (err as Error).message });
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#372a2a] text-sm font-medium text-slate-300 hover:border-primary/50 hover:text-white transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">upload_file</span>
        Submit Proof
      </button>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-surface-dark border border-[#372a2a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">upload_file</span>
          Submit Proof
        </h3>
        <button onClick={() => setExpanded(false)} className="text-text-muted hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="url"
          placeholder="https://www.moltbook.com/m/your-post-url"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          className="w-full h-11 rounded-lg bg-black/20 border border-[#372a2a] text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
        <button
          onClick={handleSubmit}
          disabled={status === "signing" || status === "submitting" || (!connected && false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "signing" || status === "submitting" ? (
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">verified</span>
          )}
          {!connected
            ? "Connect Wallet to Submit"
            : status === "signing"
              ? "Sign with wallet..."
              : status === "submitting"
                ? "Submitting..."
                : "Submit Proof"}
        </button>
      </div>

      {result && (
        <div className={`p-3 rounded-lg border ${result.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-primary/30 bg-primary/10"}`}>
          <p className={`text-sm font-medium ${result.ok ? "text-emerald-400" : "text-primary"}`}>{result.message}</p>
          {result.warnings && result.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
