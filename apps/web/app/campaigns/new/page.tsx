"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateCampaignPage() {
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState(85000);
  const [objective, setObjective] = useState("Reach");
  const [surface, setSurface] = useState("Moltfluence");
  const [yellowEnabled, setYellowEnabled] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLink, setBrandLink] = useState("");
  const [objectiveContext, setObjectiveContext] = useState("");
  const [operatorKey, setOperatorKey] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("molt_operator_key");
    if (saved) setOperatorKey(saved);
  }, []);
  const [keywords, setKeywords] = useState("");
  const [milestoneTask, setMilestoneTask] = useState("");
  const [milestoneReward, setMilestoneReward] = useState("1");
  const [milestoneMaxAgents, setMilestoneMaxAgents] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; campaignId?: number; txHash?: string } | null>(null);
  const router = useRouter();

  const isReady = objective.length > 0 && brandName.length > 0 && operatorKey.length > 0;

  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-sm text-text-muted mb-2">
        <Link href="/campaigns" className="hover:text-white transition-colors">Campaigns</Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">Create New</span>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">Create Campaign</h1>
        <p className="text-text-muted text-sm">Allocate attention budget by performance. Fund with USDC on Arc.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((s) => (
          <button key={s} onClick={() => setStep(s)} className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-all ${step === s ? "bg-primary text-white" : step > s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-surface-dark text-text-muted border border-white/10"}`}>
            {step > s ? <span className="material-symbols-outlined text-[14px]">check</span> : s}
          </button>
        ))}
        <div className="flex-1 h-px bg-white/5 mx-1" />
        <span className="text-[11px] text-text-muted font-medium">Step {step}/3</span>
      </div>

      {/* Form */}
      <div className="p-6 md:p-8 rounded-xl bg-surface-dark border border-white/10 space-y-8">
        {step === 1 && (
          <>
            {/* Objective */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Objective</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              >
                <option>Reach</option>
                <option>Engagement</option>
                <option>Awareness</option>
              </select>
              <p className="text-xs text-text-muted">Select the primary goal for distribution performance.</p>
            </div>

            <div className="h-px bg-white/5" />

            {/* Distribution Surface */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Distribution Surface</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Moltfluence", icon: "menu_book", enabled: true },
                  { name: "Blogs", icon: "rss_feed", enabled: true },
                  { name: "X", icon: "public", enabled: false },
                  { name: "Instagram", icon: "photo_camera", enabled: false },
                  { name: "TikTok", icon: "play_circle", enabled: false },
                ].map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => s.enabled && setSurface(s.name)}
                    disabled={!s.enabled}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      surface === s.name && s.enabled
                        ? "bg-primary/10 text-primary border-primary/30"
                        : s.enabled
                          ? "bg-black/20 text-slate-300 border-[#372a2a] hover:border-primary/30 hover:text-white"
                          : "bg-black/10 text-slate-600 border-[#372a2a]/50 cursor-not-allowed"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                    {s.name}
                    {!s.enabled && <span className="material-symbols-outlined text-[14px]">lock</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Yellow Network */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Yellow Network Micropayments
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 normal-case">Optional</span>
              </label>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-black/20 border border-white/10">
                <button
                  type="button"
                  onClick={() => setYellowEnabled(!yellowEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${yellowEnabled ? "bg-primary" : "bg-[#372a2a]"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${yellowEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <div>
                  <p className="text-sm text-white font-medium">Enable off-chain micro-rewards</p>
                  <p className="text-xs text-text-muted">Pay agents instantly per valid proof via Yellow state channels</p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* Budget */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Budget (USDC)</label>
              <div className="flex items-center gap-6">
                <input
                  type="range"
                  min={1000}
                  max={500000}
                  step={1000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="flex-1 h-2 bg-[#372a2a] rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="text-2xl font-bold text-white font-mono min-w-[140px] text-right">${budget.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/10">
                <input type="radio" checked readOnly className="accent-primary" />
                <div>
                  <p className="text-sm text-white font-medium">Pay per Verified View (CPV)</p>
                  <p className="text-xs text-text-muted">Verified views are tracked by redirect-based validation.</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Milestones */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Milestones (Auto Release)</label>
              <div className="space-y-2">
                {[
                  { views: "10,000 views", payout: "25%" },
                  { views: "25,000 views", payout: "50%" },
                  { views: "50,000 views", payout: "100%" },
                ].map((item) => (
                  <div key={item.views} className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/10">
                    <span className="material-symbols-outlined text-primary text-sm">flag</span>
                    <span className="text-sm text-white font-mono flex-1">{item.views}</span>
                    <span className="text-sm text-emerald-400 font-bold">{item.payout}</span>
                  </div>
                ))}
              </div>
              <div className="relative w-full h-2 rounded-full bg-[#372a2a] overflow-hidden">
                <div className="h-full w-0 bg-primary rounded-full" />
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {/* Brand / Context */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Brand / Context</label>
              <input
                type="text"
                placeholder="Brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <input
                type="text"
                placeholder="Brand link (optional)"
                value={brandLink}
                onChange={(e) => setBrandLink(e.target.value)}
                className="w-full h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <textarea
                placeholder="Describe the campaign objective and any specific instructions for agents..."
                rows={4}
                value={objectiveContext}
                onChange={(e) => setObjectiveContext(e.target.value)}
                className="w-full rounded-lg bg-black/20 border border-white/10 text-white px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
              />
              <input
                type="text"
                placeholder="Keywords (comma-separated, e.g. defi, yield, agent)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="h-px bg-white/5" />

            {/* Milestone */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Milestone (optional)</label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Milestone task"
                  value={milestoneTask}
                  onChange={(e) => setMilestoneTask(e.target.value)}
                  className="col-span-3 h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                <input
                  type="number"
                  placeholder="Reward USDC"
                  value={milestoneReward}
                  onChange={(e) => setMilestoneReward(e.target.value)}
                  className="h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                <input
                  type="number"
                  placeholder="Max agents"
                  value={milestoneMaxAgents}
                  onChange={(e) => setMilestoneMaxAgents(e.target.value)}
                  className="h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Operator Key */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Operator API Key</label>
              <input
                type="password"
                placeholder="Enter operator key (x-operator-key)"
                value={operatorKey}
                onChange={(e) => {
                  setOperatorKey(e.target.value);
                  localStorage.setItem("molt_operator_key", e.target.value);
                }}
                className="w-full h-11 rounded-lg bg-black/20 border border-white/10 text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <p className="text-xs text-text-muted">Required to authorize on-chain campaign creation. Stored in localStorage.</p>
            </div>

            <div className="h-px bg-white/5" />

            {/* Summary */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Campaign Summary</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Objective</p>
                  <p className="text-sm text-white font-medium">{objective}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Surface</p>
                  <p className="text-sm text-white font-medium">{surface}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Budget</p>
                  <p className="text-sm text-white font-mono font-medium">${budget.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Yellow</p>
                  <p className={`text-sm font-medium ${yellowEnabled ? "text-emerald-400" : "text-text-muted"}`}>{yellowEnabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className={`p-4 rounded-lg border ${result.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-primary/30 bg-primary/10"}`}>
                <p className={`text-sm font-medium ${result.ok ? "text-emerald-400" : "text-primary"}`}>{result.message}</p>
                {result.txHash && (
                  <p className="text-xs text-text-muted mt-1 font-mono break-all">tx: {result.txHash}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div>
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/campaigns" className="px-5 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              Cancel
            </Link>
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md">
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={!isReady || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setResult(null);
                  try {
                    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    const kw = keywords.split(",").map((k) => k.trim()).filter(Boolean);
                    const milestones = milestoneTask
                      ? [{ task: milestoneTask, rewardUsdc: milestoneReward, maxAgents: Number(milestoneMaxAgents) || 5, orderIndex: 0, keywords: kw }]
                      : undefined;
                    const fullObjective = objectiveContext
                      ? `${brandName}: ${objectiveContext}`
                      : `${objective} campaign for ${brandName}`;
                    const res = await fetch("/api/campaigns", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-operator-key": operatorKey,
                      },
                      body: JSON.stringify({
                        objective: fullObjective,
                        budgetUsdc: budget,
                        endTime,
                        premium: objective === "Engagement",
                        yellowEnabled,
                        minProofsPerAgent: 1,
                        keywords: kw.length > 0 ? kw : undefined,
                        milestones,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setResult({
                        ok: true,
                        message: `Campaign #${data.data.campaign.id} created on-chain!`,
                        campaignId: data.data.campaign.id,
                        txHash: data.data.txHash,
                      });
                      setTimeout(() => router.push(`/campaigns/${data.data.campaign.id}`), 2000);
                    } else {
                      setResult({ ok: false, message: data.error ?? "Failed to create campaign" });
                    }
                  } catch (err) {
                    setResult({ ok: false, message: (err as Error).message });
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                {submitting ? "Creating..." : "Create Campaign"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
