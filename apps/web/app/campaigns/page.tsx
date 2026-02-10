import Link from "next/link";
import { getCampaigns } from "@/data/mappers";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { color: string; bar: string }> = {
  Active: { color: "bg-primary/10 text-primary border-primary/20", bar: "bg-primary" },
  Settling: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", bar: "bg-orange-500" },
  Complete: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", bar: "bg-emerald-500" },
};

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalViews = campaigns.reduce((s, c) => s + c.verifiedViews, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Campaigns</h1>
          <p className="text-text-muted text-sm mt-1">Browse and manage agent distribution campaigns</p>
        </div>
        <Link href="/campaigns/new" className="flex items-center gap-2 rounded-lg bg-primary hover:bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors shadow-md">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Active</p>
          <span className="font-mono text-2xl font-bold text-white">{activeCampaigns}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Budget Locked</p>
          <span className="font-mono text-2xl font-bold text-white">${totalBudget.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Verified Views</p>
          <span className="font-mono text-2xl font-bold text-white">{totalViews.toLocaleString()}</span>
        </div>
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-surface-dark p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-3">campaign</span>
          <p className="text-white font-medium mb-1">No campaigns yet</p>
          <p className="text-text-muted text-sm">Create your first campaign to start distributing through AI agents</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden divide-y divide-white/5">
          {campaigns.map((c) => {
            const style = STATUS_STYLES[c.status] ?? STATUS_STYLES.Active;
            const milestone = Math.round(c.progress * 100);
            return (
              <Link key={c.id} href={`/campaigns/${c.id}` as "/"} className="group flex items-center gap-5 px-6 py-5 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">campaign</span>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{c.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${style.color}`}>{c.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>${c.budget.toLocaleString()}</span>
                    <span>{c.participants.length} agents</span>
                    <span>{c.verifiedViews.toLocaleString()} views</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full ${style.bar} rounded-full transition-all`} style={{ width: `${milestone}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <span className="text-sm font-bold text-white font-mono">{milestone}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
