"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Agent, NetworkNode, NetworkEdge } from "@/data/types";

/* ─── dynamic import (Three.js can't SSR) ─── */
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

/* ─── types ─── */
type Props = {
  agents: Agent[];
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

/* ─── palette ─── */
const NODE_COLORS = ["#e04d52", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];

function truncAddr(addr: string) {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ─── component ─── */
export default function NetworkGraphClient({ agents, nodes, edges }: Props) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [dimensions, setDimensions] = useState({ width: 900, height: 700 });
  const [mounted, setMounted] = useState(false);

  /* ─── measure container ─── */
  useEffect(() => {
    setMounted(true);
    const measure = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* ─── graph data ─── */
  const graphData = useMemo(() => ({
    nodes: nodes.map((n, i) => ({
      id: n.id,
      name: n.name,
      ads: n.ads,
      val: Math.max(2, n.ads / 8),
      color: NODE_COLORS[i % NODE_COLORS.length],
    })),
    links: edges.map((e) => ({
      source: e.source,
      target: e.target,
      strength: e.strength,
    })),
  }), [nodes, edges]);

  /* ─── search ─── */
  const searchLower = useMemo(() => search.trim().toLowerCase(), [search]);
  const matchedIds = useMemo(() => {
    if (!searchLower) return null;
    const out = new Set<string>();
    for (const a of agents) {
      if (`${a.name} ${a.id} ${a.idHash}`.toLowerCase().includes(searchLower)) out.add(a.id);
    }
    return out;
  }, [agents, searchLower]);

  const selectedAgent = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return agents.find((a) => a.id === selectedNodeId);
  }, [agents, selectedNodeId]);

  const connections = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges
      .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
      .map((e) => {
        const otherId = e.source === selectedNodeId ? e.target : e.source;
        const other = agents.find((a) => a.id === otherId);
        return { id: otherId, name: other?.name ?? truncAddr(otherId), strength: e.strength, ads: other?.adsScore ?? 0 };
      });
  }, [edges, selectedNodeId, agents]);

  /* ─── node click ─── */
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNodeId(node.id);
    // Fly camera to the node
    const distance = 180;
    const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1200,
      );
    }
  }, []);

  /* ─── node color ─── */
  const nodeColor = useCallback((node: any) => {
    if (node.id === selectedNodeId) return "#e04d52";
    if (matchedIds && matchedIds.has(node.id)) return "#3b82f6";
    return node.color;
  }, [selectedNodeId, matchedIds]);

  /* ─── link styling ─── */
  const linkColor = useCallback((link: any) => {
    const srcId = typeof link.source === "object" ? link.source.id : link.source;
    const tgtId = typeof link.target === "object" ? link.target.id : link.target;
    if (srcId === selectedNodeId || tgtId === selectedNodeId) return "rgba(224,77,82,0.9)";
    return "rgba(255,255,255,0.35)";
  }, [selectedNodeId]);

  const linkWidth = useCallback((link: any) => {
    const srcId = typeof link.source === "object" ? link.source.id : link.source;
    const tgtId = typeof link.target === "object" ? link.target.id : link.target;
    if (srcId === selectedNodeId || tgtId === selectedNodeId) return 3;
    return 1.5;
  }, [selectedNodeId]);

  const linkParticles = useCallback((link: any) => {
    const srcId = typeof link.source === "object" ? link.source.id : link.source;
    const tgtId = typeof link.target === "object" ? link.target.id : link.target;
    if (srcId === selectedNodeId || tgtId === selectedNodeId) return 3;
    return 0;
  }, [selectedNodeId]);

  /* ─── empty state ─── */
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col h-full -m-6 md:-m-10 lg:-m-12 items-center justify-center text-center bg-[#080810]">
        <span className="material-symbols-outlined text-5xl text-text-muted mb-4">hub</span>
        <p className="text-lg text-text-muted font-medium">No agents in the network yet</p>
        <p className="text-sm text-text-muted mt-1">Register agents to see the network graph</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full -m-6 md:-m-10 lg:-m-12 relative overflow-hidden bg-[#040408]">
      {/* ─── 3D Force Graph ─── */}
      {mounted && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          backgroundColor="#040408"
          showNavInfo={false}
          // Node styling
          nodeRelSize={6}
          nodeVal="val"
          nodeColor={nodeColor}
          nodeLabel={(node: any) => `<div style="background:rgba(0,0,0,0.85);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;font-family:system-ui;font-size:12px;color:#fff;backdrop-filter:blur(12px)">
            <div style="font-weight:700;margin-bottom:2px">${node.name}</div>
            <div style="color:#94a3b8;font-size:10px">ADS: ${node.ads.toFixed(1)}</div>
          </div>`}
          nodeOpacity={0.95}
          // Link styling
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkOpacity={1}
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleColor={() => "#e04d52"}
          // Interaction
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedNodeId(null)}
          // Force engine
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          warmupTicks={80}
          cooldownTicks={200}
        />
      )}

      {/* ─── Overlay UI ─── */}
      <div className="absolute inset-0 z-10 flex flex-col h-full pointer-events-none">
        {/* Header */}
        <header className="w-full px-6 py-4 flex items-center pointer-events-auto">
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <span>Network</span>
            <span className="text-white/20">/</span>
            <span className="text-white font-medium">Global Graph</span>
          </div>
        </header>

        {/* Search */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-[520px] px-4 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex items-center px-4 h-11">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">search</span>
            <input
              className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 focus:outline-none text-sm px-3"
              placeholder="Search agent ID, hash, or node…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6 px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-400 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(224,77,82,0.6)]" />
            Selected
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-300" />
            Agent
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-[1.5px] bg-gradient-to-r from-transparent via-slate-500 to-transparent" />
            Co-campaign
          </div>
          <span className="text-slate-500 font-mono">{nodes.length}n · {edges.length}e</span>
        </div>

        {/* Detail Panel */}
        {selectedNodeId && selectedAgent && (
          <div className="absolute top-16 bottom-8 right-6 w-[340px] flex flex-col pointer-events-auto">
            <div className="flex-1 flex flex-col bg-black/70 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {/* Panel header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Active Node</span>
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{selectedAgent.name}</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{selectedAgent.idHash}</p>
                </div>
                <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* ADS Score */}
                <div className="p-5">
                  <div className="flex items-end justify-between mb-2">
                    <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">ADS Score</h3>
                    <span className={`text-xs font-bold flex items-center ${selectedAgent.delta >= 0 ? "text-emerald-400" : "text-primary"}`}>
                      <span className="material-symbols-outlined text-[14px] mr-0.5">{selectedAgent.delta >= 0 ? "trending_up" : "trending_down"}</span>
                      {selectedAgent.delta >= 0 ? "+" : ""}{selectedAgent.delta.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white tracking-tighter tabular-nums">{selectedAgent.adsScore.toFixed(1)}</span>
                    <span className="text-sm text-slate-500">/ 100</span>
                  </div>
                  <div className="h-8 w-full mt-3 flex items-end gap-[2px]">
                    {(() => {
                      const pts = selectedAgent.metrics.length > 0 ? selectedAgent.metrics : [{ date: "Now", ads: selectedAgent.adsScore }];
                      const max = Math.max(...pts.map((p) => p.ads), 1);
                      return pts.map((p, i) => (
                        <div key={i} className={`w-full rounded-sm ${i === pts.length - 1 ? "bg-primary" : "bg-white/10"} transition-colors`} style={{ height: `${Math.max(5, (p.ads / max) * 100)}%` }} />
                      ));
                    })()}
                  </div>
                </div>

                <div className="h-px bg-white/5 mx-5" />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 p-5">
                  {[
                    { label: "Distribution", value: `${selectedAgent.breakdown.distribution}%` },
                    { label: "Reliability", value: `${selectedAgent.reliability}%`, color: selectedAgent.reliability > 95 ? "text-emerald-400" : undefined },
                    { label: "CPV", value: `$${selectedAgent.cpv.toFixed(2)}` },
                    { label: "Campaigns", value: String(selectedAgent.campaigns.length) },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase font-medium mb-1">{s.label}</div>
                      <div className={`text-sm font-mono font-medium ${s.color || "text-white"}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-white/5 mx-5" />

                {/* Connections */}
                <div className="p-5">
                  <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Connections ({connections.length})</h3>
                  {connections.length === 0 ? (
                    <p className="text-xs text-slate-500">No direct connections</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {connections.slice(0, 5).map((c) => (
                        <div key={c.id} onClick={() => {
                          setSelectedNodeId(c.id);
                          const node = graphData.nodes.find((n: any) => n.id === c.id);
                          if (node && fgRef.current) {
                            const distance = 180;
                            const fg = fgRef.current;
                            const n = fg.graphData().nodes.find((gn: any) => gn.id === c.id);
                            if (n) {
                              const distRatio = 1 + distance / Math.hypot(n.x || 0, n.y || 0, n.z || 0);
                              fg.cameraPosition(
                                { x: (n.x || 0) * distRatio, y: (n.y || 0) * distRatio, z: (n.z || 0) * distRatio },
                                n, 1200,
                              );
                            }
                          }
                        }} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-mono text-slate-300 font-bold">{c.name.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <span className="text-sm text-white group-hover:text-primary transition-colors">{c.name}</span>
                              <p className="text-[10px] text-slate-500">ADS: {c.ads.toFixed(1)}</p>
                            </div>
                          </div>
                          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${c.strength * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5">
                <a href={`/agents/${selectedAgent.id}`} className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
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
