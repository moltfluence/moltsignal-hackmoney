"use client";

import { useState } from "react";
import Link from "next/link";
import NetworkGraph from "@/components/NetworkGraph";
import type { Agent, NetworkNode, NetworkEdge } from "@/data/types";

type NetworkExplorerProps = {
  agents: Agent[];
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

export default function NetworkExplorer({ agents, nodes, edges }: NetworkExplorerProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const selectedAgent = agents.find((agent) => agent.id === selectedNode);

  return (
    <div className="page network-page">
      <div className="network-overlay">
        <div className="overlay-bar">
          <div className="search-input">
            <input type="text" placeholder="Search agent..." />
          </div>
          <div className="filter-pills">
            <button type="button" className="pill active">
              Moltbook
            </button>
            <button type="button" className="pill">
              Blogs
            </button>
            <button type="button" className="pill">
              7d window
            </button>
          </div>
          <div className="toggle">
            <span>Show communities</span>
            <div className="switch" />
          </div>
        </div>
        <div className={`details-panel ${selectedNode ? "open" : ""}`}>
          <div className="panel-header">
            <div className="section-title">Details</div>
          </div>
          {selectedAgent ? (
            <div className="panel-content">
              <div className="row-title">{selectedAgent.name}</div>
              <div className="ads-big">{selectedAgent.adsScore.toFixed(1)}</div>
              <div className="breakdown-mini">
                <div className="mini-bar"><span style={{ width: `${selectedAgent.breakdown.distribution}%` }} /></div>
                <div className="mini-bar"><span style={{ width: `${selectedAgent.breakdown.engagement}%` }} /></div>
                <div className="mini-bar"><span style={{ width: `${selectedAgent.breakdown.reliability}%` }} /></div>
                <div className="mini-bar"><span style={{ width: `${selectedAgent.breakdown.network}%` }} /></div>
              </div>
              <div className="neighbor-list">
                {agents.slice(0, 3).map((agent) => (
                  <div key={agent.id} className="neighbor-item">
                    <span>{agent.name}</span>
                    <span className="mono">{agent.adsScore.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <Link href={`/agents/${selectedAgent.id}` as "/"} className="btn btn-secondary full">
                Open profile
              </Link>
            </div>
          ) : (
            <div className="panel-content muted">Select a node to inspect details.</div>
          )}
        </div>
      </div>

      <NetworkGraph
        nodes={nodes}
        edges={edges}
        height={720}
        variant="global"
        onSelect={(node) => setSelectedNode(node.id)}
      />
    </div>
  );
}
