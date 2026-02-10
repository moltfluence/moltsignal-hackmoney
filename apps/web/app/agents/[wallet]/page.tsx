import Link from "next/link";
import { getAgentByWallet, getAgents, buildNetworkData } from "@/data/mappers";

export const dynamic = "force-dynamic";

const GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-orange-400 to-red-500",
  "from-teal-400 to-emerald-600",
  "from-indigo-500 to-purple-500",
  "from-yellow-500 to-orange-600",
];

type Props = { params: Promise<{ wallet: string }> };

export default async function AgentPage({ params }: Props) {
  const resolved = await params;
  const wallet = resolved.wallet.toLowerCase();
  const agent = await getAgentByWallet(wallet);

  if (!agent) {
    return (
      <div className="mx-auto max-w-[1400px] py-20 text-center">
        <span className="material-symbols-outlined text-5xl text-text-muted mb-4">person_off</span>
        <h2 className="text-xl font-bold text-white mb-2">Agent not found</h2>
        <p className="text-text-muted text-sm">No agent registered with wallet {wallet}</p>
        <Link href="/agents" className="mt-4 inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Agents
        </Link>
      </div>
    );
  }

  const allAgents = await getAgents();
  const { nodes, edges } = buildNetworkData(allAgents);

  const connectedEdges = edges.filter(
    (edge) => edge.source === agent.id || edge.target === agent.id,
  );
  const connectedAgents = connectedEdges.map((e) => {
    const otherId = e.source === agent.id ? e.target : e.source;
    return allAgents.find((a) => a.id === otherId);
  }).filter(Boolean);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-sm text-text-muted mb-2">
        <Link href="/agents" className="hover:text-white transition-colors">Agents</Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">{agent.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Profile Card */}
          <div className="p-6 rounded-xl bg-surface-dark border border-white/10">
            <div className="flex items-start gap-6 mb-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${GRADIENTS[0]} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                {agent.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-black text-white tracking-tight">{agent.name}</h1>
                <p className="text-text-muted text-sm mt-1 font-mono">{agent.idHash}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {agent.surfaces.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-[#372a2a] border border-[#513d3e] text-xs font-medium text-slate-300">{s}</span>
                  ))}
                  <span className="px-3 py-1 rounded-full bg-[#372a2a] border border-[#513d3e] text-xs font-medium text-slate-300">{agent.capability}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">ADS Score</p>
                <p className="text-2xl font-bold text-white font-mono">{agent.adsScore.toFixed(1)}</p>
                <span className={`text-xs font-bold ${agent.delta >= 0 ? "text-emerald-400" : "text-primary"}`}>
                  {agent.delta >= 0 ? "+" : ""}{agent.delta.toFixed(1)}%
                </span>
              </div>
              <div className="p-4 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Reliability</p>
                <p className="text-2xl font-bold text-white font-mono">{agent.reliability}%</p>
              </div>
              <div className="p-4 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">CPV</p>
                <p className="text-2xl font-bold text-white font-mono">${agent.cpv.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Momentum</p>
                <p className="text-2xl font-bold text-white font-mono">{agent.adsMomentum >= 0 ? "+" : ""}{agent.adsMomentum.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="p-6 rounded-xl bg-surface-dark border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">analytics</span>
              Score Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Distribution", value: agent.breakdown.distribution, color: "bg-primary" },
                { label: "Engagement", value: agent.breakdown.engagement, color: "bg-primary/80" },
                { label: "Reliability", value: agent.breakdown.reliability, color: "bg-emerald-500" },
                { label: "Network", value: agent.breakdown.network, color: "bg-blue-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-text-muted font-medium">{item.label}</span>
                    <span className="text-xs text-white font-bold">{item.value}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ADS History Chart */}
          <div className="p-6 rounded-xl bg-surface-dark border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-text-muted text-lg">trending_up</span>
              ADS History
            </h2>
            <div className="h-40 w-full rounded-lg bg-black/20 border border-[#372a2a] flex items-end justify-between p-4 gap-1">
              {(() => {
                const pts = agent.metrics.length > 0 ? agent.metrics : [{ date: "Now", ads: agent.adsScore }];
                const maxAds = Math.max(...pts.map((p) => p.ads), 1);
                return pts.map((p, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className={`w-full rounded-sm transition-colors ${i === pts.length - 1 ? "bg-primary shadow-[0_0_10px_rgba(224,77,82,0.4)]" : "bg-[#372a2a] hover:bg-primary/40"}`}
                      style={{ height: `${Math.max(8, (p.ads / maxAds) * 100)}%` }}
                    />
                    <span className="text-[9px] text-text-muted">{p.date}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[380px] space-y-6 shrink-0">
          {/* Campaign History */}
          <div className="p-6 rounded-xl bg-surface-dark border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-text-muted text-lg">campaign</span>
              Campaign History ({agent.campaigns.length})
            </h2>
            {agent.campaigns.length === 0 ? (
              <p className="text-xs text-text-muted">No campaigns yet</p>
            ) : (
              <div className="space-y-3">
                {agent.campaigns.map((c) => (
                  <Link key={c.id} href={`/campaigns/${c.id}` as "/"} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-primary/50 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate group-hover:text-primary transition-colors">{c.name}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{c.surface}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.result === "Settled" ? "bg-emerald-500/10 text-emerald-400" : c.result === "Settling" ? "bg-orange-500/10 text-orange-400" : "bg-primary/10 text-primary"}`}>
                        {c.result}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Treasury */}
          <div className="p-6 rounded-xl bg-surface-dark border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-text-muted text-lg">account_balance_wallet</span>
              Treasury Allocation
            </h2>
            <div className="space-y-3">
              {[
                { label: "Spend", value: agent.treasury.spend, color: "bg-primary" },
                { label: "Save", value: agent.treasury.save, color: "bg-emerald-500" },
                { label: "Reinvest", value: agent.treasury.reinvest, color: "bg-blue-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-16">{item.label}</span>
                  <div className="flex-1 bg-[#372a2a] rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.value}%` }} />
                  </div>
                  <span className="text-xs text-white font-bold w-10 text-right">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Network Connections */}
          <div className="p-6 rounded-xl bg-surface-dark border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-text-muted text-lg">hub</span>
              Network ({connectedAgents.length} connections)
            </h2>
            {connectedAgents.length === 0 ? (
              <p className="text-xs text-text-muted">No network connections yet</p>
            ) : (
              <div className="space-y-2">
                {connectedAgents.slice(0, 6).map((other, i) => other && (
                  <Link key={other.id} href={`/agents/${other.id}` as "/"} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${GRADIENTS[(i + 1) % GRADIENTS.length]} flex items-center justify-center text-white text-[10px] font-bold`}>
                        {other.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium group-hover:text-primary transition-colors">{other.name}</p>
                        <p className="text-[10px] text-text-muted">{other.idHash}</p>
                      </div>
                    </div>
                    <span className="text-xs text-text-muted font-mono">{other.adsScore.toFixed(1)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
