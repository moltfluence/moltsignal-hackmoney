import Link from "next/link";
import { getCampaigns } from "@/data/mappers";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { color: string; bar: string }> = {
  Active: { color: "bg-primary/10 text-primary border-primary/20", bar: "bg-primary" },
  Settling: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", bar: "bg-orange-500" },
  Complete: { color: "bg-green-500/10 text-green-500 border-green-500/20", bar: "bg-green-500" },
};

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] text-white">Campaigns Management</h1>
          <p className="text-text-muted text-base font-normal">Manage your active influencer campaigns and reputation scores.</p>
        </div>
        <Link href="/campaigns/new" className="flex items-center justify-center gap-2 rounded-xl h-11 px-5 border border-[#372a2a] hover:border-primary text-white hover:text-primary transition-all text-sm font-bold leading-normal bg-transparent shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>Create Campaign</span>
        </Link>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Campaign List */}
        <div className="flex-1 w-full flex flex-col gap-4 min-w-0">
          {/* Tabs */}
          <div className="flex gap-4 border-b border-[#372a2a] pb-1 mb-2 overflow-x-auto">
            {["All Campaigns", "Pending Approval", "Completed", "Drafts"].map((tab, i) => (
              <button key={tab} className={`pb-3 border-b-2 font-medium text-sm px-1 whitespace-nowrap transition-colors ${i === 0 ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-white"}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Campaign Cards */}
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-surface-dark p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-text-muted mb-2">campaign</span>
              <p className="text-text-muted text-sm">No campaigns yet</p>
              <p className="text-text-muted text-xs mt-1">Create your first campaign to get started</p>
            </div>
          ) : (
            campaigns.map((c) => {
              const style = STATUS_STYLES[c.status] ?? STATUS_STYLES.Active;
              const milestone = Math.round(c.progress * 100);
              return (
                <Link key={c.id} href={`/campaigns/${c.id}` as "/"} className="group relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 rounded-xl bg-surface-dark border border-[#372a2a] hover:border-primary/50 transition-all shadow-sm">
                  <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10 text-primary shrink-0 shadow-md">
                    <span className="material-symbols-outlined text-2xl">campaign</span>
                  </div>
                  <div className="flex flex-col flex-1 gap-3 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">{c.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${style.color}`}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                            Budget: ${c.budget.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">groups</span>
                            {c.participants.length} agents
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                            {c.verifiedViews.toLocaleString()} views
                          </span>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block shrink-0">
                        <span className="text-sm font-bold text-white">{milestone}%</span>
                        <span className="block text-xs text-text-muted">Progress</span>
                      </div>
                    </div>
                    <div className="w-full h-[6px] rounded-full bg-[#372a2a] overflow-hidden">
                      <div className={`h-full ${style.bar} rounded-full`} style={{ width: `${milestone}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[360px] flex flex-col gap-4 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
            {/* Active Campaigns */}
            <div className="p-6 rounded-xl bg-surface-dark border border-[#372a2a] shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined text-text-muted">campaign</span>
                <span className="flex h-2 w-2 rounded-full bg-[#0bda95]" />
              </div>
              <p className="text-4xl font-bold text-white tracking-tight mb-1">{activeCampaigns}</p>
              <p className="text-sm font-medium text-text-muted">Active Campaigns</p>
            </div>
            {/* Total Budget */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-surface-dark to-[#2a2020] border border-[#372a2a] shadow-sm relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="material-symbols-outlined text-text-muted">lock</span>
                <span className="text-[#0bda95] text-xs font-bold bg-[#0bda95]/10 px-2 py-0.5 rounded">+12%</span>
              </div>
              <p className="text-4xl font-bold text-white tracking-tight mb-1 relative z-10">${totalBudget.toLocaleString()}</p>
              <p className="text-sm font-medium text-text-muted relative z-10">Total Budget Locked</p>
            </div>
          </div>

          {/* Urgent Action */}
          <div className="p-6 rounded-xl bg-surface-dark border border-primary/30 relative overflow-hidden shadow-lg shadow-black/20">
            <div className="absolute top-0 right-0 p-4">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
            </div>
            <div className="flex flex-col gap-4 relative z-10">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Urgent Action</p>
                <h3 className="text-lg font-bold text-white leading-tight">80% Node Uptime Verification</h3>
              </div>
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <span className="material-symbols-outlined text-[18px]">timer</span>
                <span>Due in 4h</span>
              </div>
              <div className="w-full bg-[#372a2a] rounded-full h-1.5 mt-2">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: "80%" }} />
              </div>
              <button className="w-full py-2.5 mt-2 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-md">
                Verify Status
              </button>
            </div>
          </div>

          {/* Recent Settlements */}
          <div className="p-5 rounded-xl bg-surface-dark border border-[#372a2a] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white">Recent Settlements</h4>
            </div>
            <div className="flex flex-col gap-4">
              {campaigns.filter(c => c.settlements.length > 0).slice(0, 3).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      <span className="text-white font-medium">{c.name}</span> — {c.settlements[0]?.text}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{c.settlements[0]?.time}</p>
                  </div>
                </div>
              ))}
              {campaigns.filter(c => c.settlements.length > 0).length === 0 && (
                <p className="text-xs text-text-muted">No settlements yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
