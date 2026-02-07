"use client";

import { useState, useMemo } from "react";
import type { Agent, NetworkNode, NetworkEdge } from "@/data/types";

type Props = {
  agents: Agent[];
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

function truncAddr(addr: string) {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function NetworkGraphClient({ agents, nodes, edges }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id ?? null);
  const [search, setSearch] = useState("");

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search]);

  const matchedIds = useMemo(() => {
    if (!searchLower) return null;
    const out = new Set<string>();
    for (const a of agents) {
      const hay = `${a.name} ${a.id} ${a.idHash}`.toLowerCase();
      if (hay.includes(searchLower)) out.add(a.id);
    }
    return out;
  }, [agents, searchLower]);

  const visibleIdSet = useMemo(() => {
    if (!matchedIds) return null;
    const out = new Set<string>(matchedIds);
    if (selectedNodeId) {
      out.add(selectedNodeId);
      // Keep immediate neighbors visible so the selected node has context.
      for (const e of edges) {
        if (e.source === selectedNodeId) out.add(e.target);
        if (e.target === selectedNodeId) out.add(e.source);
      }
    }
    return out;
  }, [matchedIds, selectedNodeId, edges]);

  const visibleNodes = useMemo(() => {
    if (!visibleIdSet) return nodes;
    return nodes.filter((n) => visibleIdSet.has(n.id));
  }, [nodes, visibleIdSet]);

  const visibleEdges = useMemo(() => {
    if (!visibleIdSet) return edges;
    return edges.filter((e) => visibleIdSet.has(e.source) && visibleIdSet.has(e.target));
  }, [edges, visibleIdSet]);

  const selectedAgent = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return agents.find((a) => a.id === selectedNodeId);
  }, [agents, selectedNodeId]);

  const connections = useMemo(() => {
    if (!selectedNodeId) return [];
    return visibleEdges
      .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
      .map((e) => {
        const otherId = e.source === selectedNodeId ? e.target : e.source;
        const other = agents.find((a) => a.id === otherId);
        return { id: otherId, name: other?.name ?? truncAddr(otherId), strength: e.strength, ads: other?.adsScore ?? 0 };
      });
  }, [visibleEdges, selectedNodeId, agents]);

  // Layout nodes in a circle for the SVG graph
  const layoutNodes = useMemo(() => {
    if (visibleNodes.length === 0) return [];
    const cx = 500, cy = 400;
    const radius = Math.min(300, 150 + visibleNodes.length * 15);
    return visibleNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / visibleNodes.length - Math.PI / 2;
      const isSelected = n.id === selectedNodeId;
      return {
        ...n,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        r: isSelected ? 24 : Math.max(8, Math.min(18, n.ads / 5)),
        isSelected,
      };
    });
  }, [visibleNodes, selectedNodeId]);

  const layoutEdges = useMemo(() => {
    const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));
    return visibleEdges.map((e) => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) return null;
      return { ...e, x1: s.x, y1: s.y, x2: t.x, y2: t.y };
    }).filter(Boolean) as (NetworkEdge & { x1: number; y1: number; x2: number; y2: number })[];
  }, [visibleEdges, layoutNodes]);

  return (
    <div className="flex flex-col h-full -m-6 md:-m-10 lg:-m-12 relative overflow-hidden">
      {/* Graph Background */}
      <div className="absolute inset-0 z-0 overflow-hidden graph-bg">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="material-symbols-outlined text-6xl text-text-muted mb-4">hub</span>
            <p className="text-lg text-text-muted font-medium">No agents in the network yet</p>
            <p className="text-sm text-text-muted mt-1">Register agents to see the network graph</p>
          </div>
        ) : visibleNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="material-symbols-outlined text-6xl text-text-muted mb-4">search_off</span>
            <p className="text-lg text-text-muted font-medium">No matching agents</p>
            <p className="text-sm text-text-muted mt-1">Try a different search term</p>
          </div>
        ) : (
          <svg className="w-full h-full opacity-80" viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="edge-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" style={{ stopColor: "#334155", stopOpacity: 0.2 }} />
                <stop offset="50%" style={{ stopColor: "#475569", stopOpacity: 0.5 }} />
                <stop offset="100%" style={{ stopColor: "#334155", stopOpacity: 0.2 }} />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {layoutEdges.map((e) => (
              <line key={e.id} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="url(#edge-gradient)" strokeWidth={Math.max(0.5, e.strength * 3)} />
            ))}
            {layoutNodes.map((n) => {
              const isMatch = matchedIds ? matchedIds.has(n.id) : false;
              return (
                <g key={n.id} className="cursor-pointer" onClick={() => setSelectedNodeId(n.id)}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill="#1e293b"
                    stroke={n.isSelected ? "#e04d52" : isMatch ? "#60a5fa" : "#475569"}
                    strokeWidth={n.isSelected ? 2 : isMatch ? 2 : 1}
                    filter={n.isSelected ? "url(#glow)" : undefined}
                  />
                  {n.isSelected && <circle cx={n.x} cy={n.y} r={n.r / 3} fill="#e04d52" />}
                  <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">{n.name.slice(0, 10)}</text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Zoom Controls */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-10">
          <button className="w-10 h-10 bg-surface-dark border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button className="w-10 h-10 bg-surface-dark border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined text-[20px]">remove</span>
          </button>
          <button className="w-10 h-10 bg-surface-dark border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md mt-2">
            <span className="material-symbols-outlined text-[20px]">center_focus_strong</span>
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-8 right-8 z-10 hidden md:flex items-center gap-6 px-4 py-2 rounded-full bg-surface-dark/80 border border-slate-700/30 backdrop-blur-md text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(224,77,82,0.6)]" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-500" />
            <span>Co-campaign</span>
          </div>
          <div className="text-slate-500">{visibleNodes.length} nodes · {visibleEdges.length} edges</div>
        </div>
      </div>

      {/* Overlay Content */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none w-full">
        {/* Header */}
        <header className="w-full px-6 py-4 flex justify-between items-center pointer-events-auto">
          <div className="flex items-center text-sm text-slate-500 font-mono">
            <span className="text-slate-400">Network</span>
            <span className="mx-2">/</span>
            <span className="text-white">Global Graph</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-[720px] px-4 pointer-events-auto">
          <div className="bg-surface-dark/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row items-stretch">
            <div className="flex-1 flex items-center px-4 py-3 md:py-0 border-b md:border-b-0 md:border-r border-slate-700/50 group">
              <span className="material-symbols-outlined text-slate-500 group-focus-within:text-primary transition-colors">search</span>
              <input
                className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 focus:outline-none text-sm h-full py-3 px-2"
                placeholder="Search agent ID, hash, or node..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-0 bg-black/20 md:bg-transparent">
              <div className="flex items-center h-full">
                <button className="h-full px-4 py-3 md:py-0 flex items-center gap-2 text-xs font-medium text-slate-300 hover:bg-white/5 border-r border-slate-700/50 transition-colors whitespace-nowrap">
                  <span className="material-symbols-outlined text-[16px] text-primary">filter_list</span>
                  <span>Reputation &gt; 50</span>
                </button>
              </div>
              <button className="h-full px-5 py-3 md:py-0 bg-primary hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center">
                Explore
              </button>
            </div>
          </div>
        </div>

        {/* Node Detail Panel */}
        {selectedNodeId && selectedAgent && (
          <div className="absolute top-20 bottom-8 right-6 w-[360px] flex flex-col pointer-events-auto">
            <div className="flex-1 flex flex-col bg-surface-dark/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-700/50 flex justify-between items-start bg-gradient-to-b from-white/5 to-transparent">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active Node</span>
                  </div>
                  <h2 className="text-xl font-bold text-white font-mono tracking-tight">{selectedAgent.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedAgent.idHash} · Last active: {selectedAgent.lastActive}</p>
                </div>
                <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* ADS Score */}
                <div className="p-6">
                  <div className="flex items-end justify-between mb-2">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">ADS Reputation Score</h3>
                    <span className={`text-xs font-bold flex items-center ${selectedAgent.delta >= 0 ? "text-emerald-400" : "text-primary"}`}>
                      <span className="material-symbols-outlined text-[14px] mr-0.5">{selectedAgent.delta >= 0 ? "trending_up" : "trending_down"}</span>
                      {selectedAgent.delta >= 0 ? "+" : ""}{selectedAgent.delta.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white tracking-tighter tabular-nums">{selectedAgent.adsScore.toFixed(1)}</span>
                    <span className="text-lg text-slate-500 font-medium">/ 100</span>
                  </div>
                  <div className="h-10 w-full mt-4 flex items-end gap-[2px]">
                    {(() => {
                      const pts = selectedAgent.metrics.length > 0 ? selectedAgent.metrics : [{ date: "Now", ads: selectedAgent.adsScore }];
                      const max = Math.max(...pts.map((p) => p.ads), 1);
                      return pts.map((p, i) => (
                        <div key={i} className={`w-full rounded-sm ${i === pts.length - 1 ? "bg-primary shadow-[0_0_8px_rgba(224,77,82,0.5)]" : "bg-slate-800 hover:bg-primary/50"} transition-colors`} style={{ height: `${Math.max(5, (p.ads / max) * 100)}%` }} />
                      ));
                    })()}
                  </div>
                </div>

                <div className="h-px bg-slate-800 mx-6" />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 p-6">
                  {[
                    { label: "Distribution", value: `${selectedAgent.breakdown.distribution}%` },
                    { label: "Reliability", value: `${selectedAgent.reliability}%`, valueColor: selectedAgent.reliability > 95 ? "text-emerald-400" : undefined },
                    { label: "CPV", value: `$${selectedAgent.cpv.toFixed(2)}` },
                    { label: "Campaigns", value: String(selectedAgent.campaigns.length) },
                  ].map((s) => (
                    <div key={s.label} className="bg-black/20 rounded-lg p-3 border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-medium mb-1">{s.label}</div>
                      <div className={`text-sm font-mono ${s.valueColor || "text-slate-200"}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-slate-800 mx-6" />

                {/* Connections */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Connections ({connections.length})</h3>
                  </div>
                  {connections.length === 0 ? (
                    <p className="text-xs text-slate-500">No direct connections</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {connections.slice(0, 5).map((c) => (
                        <div key={c.id} onClick={() => setSelectedNodeId(c.id)} className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-300">{c.name.slice(0, 2)}</div>
                            <div className="flex flex-col">
                              <span className="text-sm font-mono text-slate-200 group-hover:text-primary transition-colors">{c.name}</span>
                              <span className="text-[10px] text-slate-500">ADS: {c.ads.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">{Math.round(c.strength * 100)}%</span>
                            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${c.strength > 0.7 ? "bg-primary shadow-[0_0_5px_rgba(224,77,82,0.5)]" : "bg-slate-500"}`} style={{ width: `${c.strength * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-700/50 bg-black/20">
                <a href={`/agents/${selectedAgent.id}`} className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-slate-700/50 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Open Full Profile
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
