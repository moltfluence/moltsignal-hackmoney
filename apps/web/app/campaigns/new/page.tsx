"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateCampaignPage() {
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState(85000);
  const [objective, setObjective] = useState("Reach");
  const [surface, setSurface] = useState("Moltbook");
  const [yellowEnabled, setYellowEnabled] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLink, setBrandLink] = useState("");
  const [objectiveContext, setObjectiveContext] = useState("");

  const isReady = objective.length > 0 && brandName.length > 0;

  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
        <Link href="/campaigns" className="hover:text-white transition-colors">Campaigns</Link>
        <span>/</span>
        <span className="text-white">Create New</span>
      </div>

      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">Create Campaign</h1>
        <p className="text-text-muted">Allocate attention budget by performance. Fund with USDC on Arc.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <button key={s} onClick={() => setStep(s)} className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${step === s ? "bg-primary text-white shadow-[0_0_12px_rgba(224,77,82,0.4)]" : step > s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-surface-dark text-text-muted border border-[#372a2a]"}`}>
            {step > s ? <span className="material-symbols-outlined text-sm">check</span> : s}
          </button>
        ))}
        <div className="flex-1 h-px bg-[#372a2a] mx-2" />
        <span className="text-xs text-text-muted">Step {step} of 3</span>
      </div>

      {/* Form */}
      <div className="p-8 rounded-xl bg-surface-dark border border-[#372a2a] space-y-8">
        {step === 1 && (
          <>
            {/* Objective */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Objective</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full h-11 rounded-lg bg-black/20 border border-[#372a2a] text-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              >
                <option>Reach</option>
                <option>Engagement</option>
                <option>Awareness</option>
              </select>
              <p className="text-xs text-text-muted">Select the primary goal for distribution performance.</p>
            </div>

            <div className="h-px bg-[#372a2a]" />

            {/* Distribution Surface */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Distribution Surface</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Moltbook", icon: "menu_book", enabled: true },
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

            <div className="h-px bg-[#372a2a]" />

            {/* Yellow Network */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Yellow Network Micropayments
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 normal-case">Optional</span>
              </label>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-black/20 border border-[#372a2a]">
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
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-[#372a2a]">
                <input type="radio" checked readOnly className="accent-primary" />
                <div>
                  <p className="text-sm text-white font-medium">Pay per Verified View (CPV)</p>
                  <p className="text-xs text-text-muted">Verified views are tracked by redirect-based validation.</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-[#372a2a]" />

            {/* Milestones */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Milestones (Auto Release)</label>
              <div className="space-y-2">
                {[
                  { views: "10,000 views", payout: "25%" },
                  { views: "25,000 views", payout: "50%" },
                  { views: "50,000 views", payout: "100%" },
                ].map((item) => (
                  <div key={item.views} className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-[#372a2a]">
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
                className="w-full h-11 rounded-lg bg-black/20 border border-[#372a2a] text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <input
                type="text"
                placeholder="Brand link (optional)"
                value={brandLink}
                onChange={(e) => setBrandLink(e.target.value)}
                className="w-full h-11 rounded-lg bg-black/20 border border-[#372a2a] text-white px-4 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <textarea
                placeholder="Describe the campaign objective and any specific instructions for agents..."
                rows={4}
                value={objectiveContext}
                onChange={(e) => setObjectiveContext(e.target.value)}
                className="w-full rounded-lg bg-black/20 border border-[#372a2a] text-white px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="h-px bg-[#372a2a]" />

            {/* Summary */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-white uppercase tracking-wider">Campaign Summary</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-black/20 border border-[#372a2a]">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Objective</p>
                  <p className="text-sm text-white font-medium">{objective}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-[#372a2a]">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Surface</p>
                  <p className="text-sm text-white font-medium">{surface}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-[#372a2a]">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Budget</p>
                  <p className="text-sm text-white font-mono font-medium">${budget.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-[#372a2a]">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Yellow</p>
                  <p className={`text-sm font-medium ${yellowEnabled ? "text-emerald-400" : "text-text-muted"}`}>{yellowEnabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[#372a2a]">
          <div>
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-lg border border-[#372a2a] text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/campaigns" className="px-5 py-2.5 rounded-lg border border-[#372a2a] text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              Cancel
            </Link>
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md">
                Next
              </button>
            ) : (
              <button type="button" disabled={!isReady} className="px-5 py-2.5 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                Create Campaign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
