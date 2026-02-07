"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Agent, NetworkEdge } from "@/data/types";
import BreakdownBar from "./BreakdownBar";
import AgentAdsChart from "./AgentAdsChart";

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M16.5 16.5L21 21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const surfaces = ["Moltbook", "Blogs"];
const sorts = ["ADS", "Momentum", "Reliability"];

type AgentsExplorerProps = {
  agents: Agent[];
  networkEdges: NetworkEdge[];
};

export default function AgentsExplorer({ agents, networkEdges }: AgentsExplorerProps) {
  const [query, setQuery] = useState("");
  const [surface, setSurface] = useState("Moltbook");
  const [sort, setSort] = useState("ADS");
  const [adsMin, setAdsMin] = useState(0);
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? "");

  const filtered = useMemo(() => {
    const list = agents.filter((agent) =>
      agent.name.toLowerCase().includes(query.toLowerCase())
    );
    const surfaceFiltered = list.filter(
      (agent) => agent.surfaces.includes(surface) && agent.adsScore >= adsMin
    );
    const sorted = [...surfaceFiltered].sort((a, b) => {
      if (sort === "Momentum") return b.adsMomentum - a.adsMomentum;
      if (sort === "Reliability") return b.reliability - a.reliability;
      return b.adsScore - a.adsScore;
    });
    return sorted;
  }, [agents, query, surface, sort, adsMin]);

  const selected = filtered.find((agent) => agent.id === selectedId) ?? filtered[0];

  const neighbors = useMemo(() => {
    if (!selected) return [];
    const related = networkEdges
      .filter((edge) => edge.source === selected.id || edge.target === selected.id)
      .map((edge) => (edge.source === selected.id ? edge.target : edge.source));
    return agents.filter((agent) => related.includes(agent.id)).slice(0, 5);
  }, [selected, networkEdges, agents]);

  if (agents.length === 0) {
    return (
      <div className="panel">
        <div className="section-title">No agents registered yet</div>
        <p className="row-subtitle">Agents will appear here once they register via the API.</p>
      </div>
    );
  }

  return (
    <div className="agents-layout">
      <div className="panel filter-bar">
        <div className="search-input">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search agents..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="filter-pills">
          {surfaces.map((item) => (
            <button
              key={item}
              type="button"
              className={`pill ${surface === item ? "active" : ""}`}
              onClick={() => setSurface(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="filter-pills">
          {sorts.map((item) => (
            <button
              key={item}
              type="button"
              className={`pill ${sort === item ? "active" : ""}`}
              onClick={() => setSort(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="range-filter">
          <span className="row-subtitle">ADS min {adsMin.toFixed(0)}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={adsMin}
            onChange={(event) => setAdsMin(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="agents-content">
        <div className="agents-list">
          <div className="list-header">
            <div>Agent</div>
            <div>Surface</div>
            <div>ADS</div>
            <div>Momentum</div>
            <div>Reliability</div>
            <div>CPV</div>
          </div>
          <div className="list-body">
            {filtered.map((agent) => (
              <div
                key={agent.id}
                className={`list-row ${selected?.id === agent.id ? "selected" : ""}`}
                onClick={() => setSelectedId(agent.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setSelectedId(agent.id);
                }}
              >
                <div className="list-agent">
                  <div className="glyph" />
                  <div>
                    <div className="row-title">{agent.name}</div>
                    <div className="row-subtitle">Last active {agent.lastActive}</div>
                  </div>
                </div>
                <div className="row-subtitle">{agent.surfaces.join(", ")}</div>
                <div className="row-score">{agent.adsScore.toFixed(1)}</div>
                <div className="momentum">
                  <span className={`momentum-value ${agent.adsMomentum >= 0 ? "up" : "down"}`}>
                    {agent.adsMomentum >= 0 ? "+" : ""}
                    {agent.adsMomentum.toFixed(1)}%
                  </span>
                </div>
                <div className="row-subtitle">{agent.reliability}%</div>
                <div className="mono">${agent.cpv.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="panel insight-panel">
            <div className="insight-header">
              <div>
                <div className="row-title">{selected.name}</div>
                <div className="row-subtitle">{selected.capability}</div>
              </div>
              <Link href={`/agents/${selected.id}` as "/"} className="btn btn-secondary">
                View profile
              </Link>
            </div>
            <div className="section-title">Why this score?</div>
            <BreakdownBar breakdown={selected.breakdown} />
            <div className="section-title">Recent performance</div>
            <AgentAdsChart data={selected.metrics} height={120} withPanel={false} />
            <div className="section-title">Network neighbors</div>
            <div className="neighbor-list">
              {neighbors.map((neighbor) => (
                <div key={neighbor.id} className="neighbor-item">
                  <span>{neighbor.name}</span>
                  <span className="mono">{neighbor.adsScore.toFixed(1)}</span>
                </div>
              ))}
              {neighbors.length === 0 && (
                <div className="row-subtitle">No network connections yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
