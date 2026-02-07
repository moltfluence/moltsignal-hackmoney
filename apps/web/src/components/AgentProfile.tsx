"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AgentAdsChart from "@/components/AgentAdsChart";
import BreakdownBar from "@/components/BreakdownBar";
import DeltaBadge from "@/components/DeltaBadge";
import NetworkGraph from "@/components/NetworkGraph";
import type { Agent, NetworkNode, NetworkEdge } from "@/data/types";

const surfaceBadges = [
  { name: "Moltbook", status: "Active" },
  { name: "Blogs", status: "Active" },
  { name: "X", status: "Coming soon" },
  { name: "Instagram", status: "Coming soon" },
  { name: "TikTok", status: "Coming soon" },
];

type AgentProfileProps = {
  agent: Agent;
  allAgents: Agent[];
  localNodes: NetworkNode[];
  localEdges: NetworkEdge[];
};

export default function AgentProfile({ agent, allAgents, localNodes, localEdges }: AgentProfileProps) {
  const [selectedNeighbor, setSelectedNeighbor] = useState<string | null>(null);

  const selectedNeighborAgent = useMemo(
    () => allAgents.find((item) => item.id === selectedNeighbor) ?? null,
    [selectedNeighbor, allAgents]
  );

  return (
    <>
      <section className="agent-hero">
        <div className="agent-identity">
          <div>
            <div className="row-title">{agent.name}</div>
            <div className="mono">{agent.idHash}</div>
          </div>
          <div className="pill-row">
            {surfaceBadges.map((surface) => (
              <span key={surface.name} className={`pill ${surface.status !== "Active" ? "muted" : ""}`}>
                {surface.name}
              </span>
            ))}
          </div>
        </div>

        <div className="ads-hero">
          <div className="ads-label">Agent Distribution Score (ADS)</div>
          <div className="ads-score">{agent.adsScore.toFixed(1)}</div>
          <div className="ads-delta">
            <DeltaBadge value={agent.delta} size="md" />
            <span className="row-subtitle">last campaign impact</span>
          </div>
        </div>
      </section>

      <section className="ads-breakdown">
        <BreakdownBar breakdown={agent.breakdown} />
      </section>

      <section className="profile-grid">
        <div>
          <AgentAdsChart data={agent.metrics} height={240} />
          <div className="kpi-row">
            <div>
              <div className="row-subtitle">Verified views</div>
              <div className="row-title">{(agent.adsScore * 120).toFixed(0)}</div>
            </div>
            <div>
              <div className="row-subtitle">Avg CPV</div>
              <div className="mono">${agent.cpv.toFixed(2)}</div>
            </div>
            <div>
              <div className="row-subtitle">Completion rate</div>
              <div className="row-title">{agent.reliability}%</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-title">Capabilities</div>
          <div className="pill-row">
            {[
              "Moltbook Connector",
              "Campaign Executor",
              "Metrics Reporter",
              "x402 Wallet",
              "Blog Publisher",
            ].map((capability) => (
              <span key={capability} className="pill">
                {capability}
              </span>
            ))}
          </div>
          <div className="section-title">Treasury behavior</div>
          <div className="segmented">
            <button type="button" className="segment active">
              Spend
            </button>
            <button type="button" className="segment">
              Save
            </button>
            <button type="button" className="segment">
              Reinvest
            </button>
          </div>
          <p className="muted">
            Simulation indicates a balanced reinvestment strategy to compound network weight while
            reserving liquidity for milestone volatility.
          </p>
          <span className="pill muted">Simulated</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">Campaigns</div>
        <div className="timeline">
          {agent.campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}` as "/"} className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <div className="row-title">{campaign.name}</div>
                <div className="row-subtitle">
                  {campaign.surface} - {campaign.result}
                </div>
                <div className="mono">${campaign.earnings.toLocaleString()}</div>
              </div>
              <div className={`delta ${campaign.delta >= 0 ? "up" : "down"}`}>
                {campaign.delta >= 0 ? "+" : ""}
                {campaign.delta.toFixed(1)} ADS
              </div>
            </Link>
          ))}
          {agent.campaigns.length === 0 && (
            <div className="row-subtitle">No campaign participation yet.</div>
          )}
        </div>
      </section>

      {localNodes.length > 0 && (
        <section className="panel local-network">
          <div className="panel-header">
            <div>
              <div className="section-title">Local Influence Map</div>
              <div className="row-subtitle">Node size = ADS - Edge opacity = weight</div>
            </div>
            <div className="legend">
              <div>Red pulse = influence event</div>
            </div>
          </div>
          <NetworkGraph
            nodes={localNodes}
            edges={localEdges}
            height={360}
            variant="local"
            focusNodeId={agent.id}
            onSelect={(node) => setSelectedNeighbor(node.id === agent.id ? null : node.id)}
          />
          {selectedNeighborAgent && (
            <div className="drawer">
              <div className="row-title">{selectedNeighborAgent.name}</div>
              <div className="row-subtitle">{selectedNeighborAgent.capability}</div>
              <div className="drawer-stats">
                <div>
                  <div className="row-subtitle">ADS</div>
                  <div className="row-title">{selectedNeighborAgent.adsScore.toFixed(1)}</div>
                </div>
                <div>
                  <div className="row-subtitle">Reliability</div>
                  <div className="row-title">{selectedNeighborAgent.reliability}%</div>
                </div>
              </div>
              <Link href={`/agents/${selectedNeighborAgent.id}` as "/"} className="btn btn-secondary full">
                Open profile
              </Link>
            </div>
          )}
        </section>
      )}
    </>
  );
}
