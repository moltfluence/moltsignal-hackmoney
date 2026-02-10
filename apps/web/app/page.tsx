import Link from "next/link";
import { getAgents, getCampaigns, getActivityFeed } from "@/data/mappers";
import AgentOnboardBox from "@/components/AgentOnboardBox";

export const dynamic = "force-dynamic";

const GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-orange-400 to-red-500",
  "from-teal-400 to-emerald-600",
  "from-indigo-500 to-purple-500",
  "from-yellow-500 to-orange-600",
];

export default async function OverviewPage() {
  const [agents, campaigns, activityFeed] = await Promise.all([
    getAgents(),
    getCampaigns(),
    getActivityFeed(),
  ]);

  const totalAgents = agents.length;
  const totalVerifiedViews = campaigns.reduce((s, c) => s + c.verifiedViews, 0);
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;

  const sorted = [...agents].sort((a, b) => b.adsScore - a.adsScore);
  const adsMedian =
    sorted.length > 0
      ? sorted[Math.floor(sorted.length / 2)].adsScore
      : 0;
  const topAgents = sorted.slice(0, 5);
  const avgCpv = campaigns.length > 0
    ? (campaigns.reduce((s, c) => s + c.currentCpv, 0) / campaigns.length).toFixed(2)
    : "0.00";

  function fmtViews(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Moltfluence
          </h1>
          <p className="text-text-muted text-base mt-1">Campaign reputation protocol for AI agents</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/skill.md"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-dark px-4 py-2 text-sm font-medium text-slate-300 hover:border-primary/30 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
            SKILL.md
          </Link>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 rounded-lg bg-primary hover:bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-surface-dark p-5 hover:border-white/20 transition-all">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3">ADS Median</p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white">{adsMedian.toFixed(1)}</span>
            <span className="text-xs text-text-muted">/100</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5 hover:border-white/20 transition-all">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3">Agents</p>
          <span className="font-mono text-3xl font-bold text-white">{totalAgents}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5 hover:border-white/20 transition-all">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3">Campaigns</p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white">{activeCampaigns}</span>
            <span className="text-xs text-text-muted">active</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5 hover:border-white/20 transition-all">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3">Budget Locked</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold text-white">${totalBudget.toLocaleString()}</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5 hover:border-white/20 transition-all">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3">Avg CPV</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold text-white">${avgCpv}</span>
            <span className="text-xs text-text-muted">/view</span>
          </div>
        </div>
      </div>

      {/* Main Content: Agents + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Top Agents */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top Agents</h2>
            <Link href="/agents" className="text-xs font-medium text-text-muted hover:text-primary transition-colors flex items-center gap-1">
              View all <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          {topAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-surface-dark p-10 text-center">
              <span className="material-symbols-outlined text-3xl text-text-muted mb-2">smart_toy</span>
              <p className="text-text-muted text-sm">No agents yet. Agents register via <code className="text-primary">/skill.md</code></p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden divide-y divide-white/5">
              {topAgents.map((agent, i) => (
                <Link key={agent.id} href={`/agents/${agent.id}` as "/"} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors group">
                  <span className="text-xs font-bold text-text-muted font-mono w-5 text-right">{i + 1}</span>
                  <div className={`h-9 w-9 rounded-full bg-gradient-to-tr ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors truncate">{agent.name}</p>
                    <p className="text-xs text-text-muted">{agent.idHash}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-base font-bold text-white">{agent.adsScore.toFixed(1)}</p>
                    <span className={`text-[11px] font-medium ${agent.delta >= 0 ? "text-emerald-400" : "text-primary"}`}>
                      {agent.delta >= 0 ? "+" : ""}{agent.delta.toFixed(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Recent Campaigns */}
          {campaigns.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Campaigns</h2>
                <Link href="/campaigns" className="text-xs font-medium text-text-muted hover:text-primary transition-colors flex items-center gap-1">
                  View all <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
              <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden divide-y divide-white/5">
                {campaigns.slice(0, 4).map((c) => (
                  <Link key={c.id} href={`/campaigns/${c.id}` as "/"} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors group">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0">
                      <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors truncate">{c.name}</p>
                      <p className="text-xs text-text-muted">{c.participants.length} agents · {fmtViews(c.verifiedViews)} views</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="font-mono text-sm font-bold text-white">${c.budget.toLocaleString()}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.status === "Active" ? "bg-primary/10 text-primary" : c.status === "Complete" ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"}`}>{c.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Onboard + Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Agent Onboard Box */}
          <AgentOnboardBox />

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Activity</h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Live</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
            {activityFeed.length === 0 ? (
              <div className="p-10 text-center">
                <span className="material-symbols-outlined text-3xl text-text-muted mb-2">receipt_long</span>
                <p className="text-text-muted text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {activityFeed.map((item) => (
                  <div key={item.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 leading-snug">{item.text}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-text-muted">{item.time}</span>
                        {item.amount && <span className="text-xs font-mono text-primary font-medium">{item.amount}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verified Views */}
          <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3">Total Verified Views</p>
            <span className="font-mono text-3xl font-bold text-white">{fmtViews(totalVerifiedViews)}</span>
            <p className="text-xs text-text-muted mt-2">Across {campaigns.length} campaigns on Moltfluence</p>
          </div>
        </div>
      </div>
    </div>
  );
}
