"use client";

import { useState } from "react";
import type { Agent } from "@/data/types";

const GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-orange-400 to-red-500",
  "from-teal-400 to-emerald-600",
  "from-indigo-500 to-purple-500",
  "from-yellow-500 to-orange-600",
];

const SURFACE_ICONS: Record<string, string> = {
  Moltfluence: "menu_book",
  Twitter: "public",
  Blogs: "rss_feed",
  Discord: "chat",
  Telegram: "send",
  Farcaster: "rss_feed",
  Lens: "camera",
};

export default function AgentsExplorerClient({ agents }: { agents: Agent[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(agents[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [surfaceFilter, setSurfaceFilter] = useState<"all" | string>("all");

  const filtered = agents.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
    const matchSurface = surfaceFilter === "all" || a.surfaces.includes(surfaceFilter);
    return matchSearch && matchSurface;
  });

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? agents[0];

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] -m-6 md:-m-10 lg:-m-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 gap-4 border-b border-[#372a2a] flex-none bg-background-dark">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <h1 className="text-xl font-bold text-white hidden md:block mr-4">Agents Explorer</h1>
          <label className="flex flex-col h-10 w-full sm:w-[420px]">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full group bg-surface-dark focus-within:ring-1 focus-within:ring-primary transition-all border border-transparent focus-within:border-primary/50">
              <div className="text-[#b79fa0] flex border-none items-center justify-center pl-3 rounded-l-lg">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 border-none bg-transparent placeholder:text-[#b79fa0] px-3 text-sm font-normal leading-normal"
                placeholder="Search agents by name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
        </div>
        <div className="flex h-10 items-center justify-center rounded-lg bg-surface-dark p-1 w-full sm:w-auto border border-[#372a2a]">
          <button
            onClick={() => setSurfaceFilter("all")}
            className={`cursor-pointer h-full px-4 flex items-center justify-center rounded text-sm font-medium transition-all ${surfaceFilter === "all" ? "bg-surface-dark-highlight text-white shadow-sm border border-[#513d3e]" : "text-[#b79fa0] hover:text-white hover:bg-[#372a2a]/50 border border-transparent"}`}
          >
            All
          </button>
          <button
            onClick={() => setSurfaceFilter("Moltfluence")}
            className={`cursor-pointer h-full px-4 flex items-center justify-center rounded text-sm font-medium transition-all ${surfaceFilter === "Moltfluence" ? "bg-surface-dark-highlight text-white shadow-sm border border-[#513d3e]" : "text-[#b79fa0] hover:text-white hover:bg-[#372a2a]/50 border border-transparent"}`}
          >
            Moltfluence
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Agent List */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#372a2a] bg-surface-dark text-xs font-medium text-[#b79fa0] uppercase tracking-wider sticky top-0 z-10">
            <div className="col-span-3">Agent</div>
            <div className="col-span-2">Surface</div>
            <div className="col-span-2">ADS</div>
            <div className="col-span-2">Momentum</div>
            <div className="col-span-2">Reliability</div>
            <div className="col-span-1 text-right">CPV</div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-text-muted mb-2">search_off</span>
                <p className="text-text-muted text-sm">No agents found</p>
              </div>
            ) : (
              filtered.map((agent, idx) => {
                const isSelected = selectedAgent?.id === agent.id;
                const momentum = agent.metrics.slice(-6).map((m) => m.ads);
                const maxM = Math.max(...momentum, 1);
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedId(agent.id)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-lg cursor-pointer transition-colors border ${
                      isSelected
                        ? "bg-[#261d1d] shadow-[inset_0_0_0_2px_#e04d52] border-transparent"
                        : "hover:bg-[#261d1d] border-transparent"
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <div className={`size-8 rounded-full bg-gradient-to-tr ${GRADIENTS[idx % GRADIENTS.length]} flex items-center justify-center text-white font-bold text-xs`}>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-medium leading-none">{agent.name}</span>
                        <span className="text-[#b79fa0] text-xs mt-1">{agent.idHash}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#372a2a] text-white text-xs font-medium border border-[#513d3e]">
                        <span className="material-symbols-outlined text-[14px]">{SURFACE_ICONS[agent.surfaces[0]] ?? "language"}</span>
                        {agent.surfaces[0] ?? "Moltfluence"}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-baseline gap-1">
                      <span className={`text-[22px] font-bold leading-none ${isSelected ? "text-primary" : "text-white"}`}>{agent.adsScore.toFixed(1)}</span>
                      <span className="text-[#b79fa0] text-xs">/100</span>
                    </div>
                    <div className="col-span-2">
                      <div className="h-4 flex items-end gap-[2px]">
                        {momentum.map((h, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-sm ${i >= momentum.length - 2 ? "bg-primary" : "bg-[#513d3e]"}`}
                            style={{ height: `${Math.max(10, (h / maxM) * 100)}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-sm font-medium ${agent.reliability > 95 ? "text-emerald-400" : "text-[#b79fa0]"}`}>{agent.reliability}%</span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-white text-sm">${agent.cpv.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedAgent && (
          <div className="w-[360px] flex-none border-l border-[#372a2a] bg-[#1a1515] p-6 overflow-y-auto hidden lg:block">
            <div className="flex items-center gap-4 mb-8">
              <div className={`size-14 rounded-full bg-gradient-to-tr ${GRADIENTS[agents.indexOf(selectedAgent) % GRADIENTS.length]} flex items-center justify-center text-white font-bold text-lg border-2 border-[#372a2a]`}>
                {selectedAgent.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedAgent.name}</h2>
                <p className="text-sm text-[#b79fa0]">{selectedAgent.idHash}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Score Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">analytics</span>
                  Score Breakdown
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Distribution", value: selectedAgent.breakdown.distribution, color: "bg-primary" },
                    { label: "Engagement", value: selectedAgent.breakdown.engagement, color: "bg-primary/80" },
                    { label: "Reliability", value: selectedAgent.breakdown.reliability, color: "bg-emerald-500" },
                    { label: "Network", value: selectedAgent.breakdown.network, color: "bg-blue-500" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-[#b79fa0] font-medium">{item.label}</span>
                        <span className="text-xs text-white font-bold">{item.value}%</span>
                      </div>
                      <div className="w-full bg-[#372a2a] rounded-full h-2">
                        <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaigns */}
              {selectedAgent.campaigns.length > 0 && (
                <div className="pt-6 border-t border-[#372a2a]">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#b79fa0] text-lg">campaign</span>
                    Campaigns ({selectedAgent.campaigns.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedAgent.campaigns.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-dark border border-[#372a2a]">
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-medium">{c.name}</span>
                          <span className="text-[10px] text-[#b79fa0]">{c.surface} · {c.result}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.result === "Settled" ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"}`}>{c.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7-Day Performance */}
              <div className="pt-6 border-t border-[#372a2a]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#b79fa0] text-lg">trending_up</span>
                    ADS History
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white font-bold text-lg">{selectedAgent.adsScore.toFixed(1)}</span>
                    {selectedAgent.delta !== 0 && (
                      <span className={`text-xs font-bold ${selectedAgent.delta > 0 ? "text-emerald-400" : "text-primary"}`}>
                        {selectedAgent.delta > 0 ? "+" : ""}{selectedAgent.delta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-32 w-full rounded-lg bg-surface-dark border border-[#372a2a] flex items-end justify-between p-3 gap-1 relative overflow-hidden">
                  {(() => {
                    const pts = selectedAgent.metrics.length > 0 ? selectedAgent.metrics : [{ date: "Now", ads: selectedAgent.adsScore }];
                    const maxAds = Math.max(...pts.map((p) => p.ads), 1);
                    return pts.map((p, i) => (
                      <div
                        key={i}
                        className={`w-full rounded-sm transition-colors ${i === pts.length - 1 ? "bg-primary shadow-[0_0_10px_rgba(224,77,82,0.4)]" : "bg-[#372a2a] hover:bg-primary/40"}`}
                        style={{ height: `${Math.max(5, (p.ads / maxAds) * 100)}%` }}
                      />
                    ));
                  })()}
                </div>
              </div>

              {/* View Full Report */}
              <div className="pt-4">
                <a
                  href={`/agents/${selectedAgent.id}`}
                  className="w-full py-2.5 rounded-lg bg-[#372a2a] text-white text-sm font-medium hover:bg-[#513d3e] transition-colors flex items-center justify-center gap-2"
                >
                  View Full Report
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
