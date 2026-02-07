const campaigns = [
  { name: "Zk-Rollup Alpha Launch", status: "Active", statusColor: "bg-primary/10 text-primary border-primary/20", budget: "$50,000", payout: "Pending", payoutIcon: "payments", milestone: 75, barColor: "bg-primary", icon: <span className="font-bold text-xl">𝕏</span>, iconBg: "bg-black" },
  { name: "Node Operator Grant", status: "Settling", statusColor: "bg-orange-500/10 text-orange-500 border-orange-500/20", budget: "$25,000", payout: "Ready", payoutIcon: "check_circle", milestone: 95, barColor: "bg-orange-500", icon: <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 00-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" /></svg>, iconBg: "bg-[#5865F2]" },
  { name: "Token Gated Access", status: "Complete", statusColor: "bg-green-500/10 text-green-500 border-green-500/20", budget: "$70,000", payout: "Sent", payoutIcon: "done_all", milestone: 100, barColor: "bg-green-500", icon: <span className="material-symbols-outlined">play_circle</span>, iconBg: "bg-[#abfe2c] text-[#00501e]" },
  { name: "DeFi Summer 2.0 Hype", status: "Active", statusColor: "bg-primary/10 text-primary border-primary/20", budget: "$12,500", payout: "Scheduled", payoutIcon: "payments", milestone: 45, barColor: "bg-primary", icon: <span className="font-bold text-xl">𝕏</span>, iconBg: "bg-black" },
];

export default function CampaignsPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] text-white">Campaigns Management</h1>
          <p className="text-text-muted text-base font-normal">Manage your active influencer campaigns and reputation scores.</p>
        </div>
        <button className="flex items-center justify-center gap-2 rounded-xl h-11 px-5 border border-[#372a2a] hover:border-primary text-white hover:text-primary transition-all text-sm font-bold leading-normal bg-transparent shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>Create Campaign</span>
        </button>
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
          {campaigns.map((c) => (
            <div key={c.name} className="group relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 rounded-xl bg-surface-dark border border-[#372a2a] hover:border-primary/50 transition-all shadow-sm">
              <div className={`flex items-center justify-center size-12 rounded-lg ${c.iconBg} text-white shrink-0 shadow-md`}>
                {c.icon}
              </div>
              <div className="flex flex-col flex-1 gap-3 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">{c.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${c.statusColor}`}>{c.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                        Budget: {c.budget}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">{c.payoutIcon}</span>
                        Payout: {c.payout}
                      </span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block shrink-0">
                    <span className="text-sm font-bold text-white">{c.milestone}%</span>
                    <span className="block text-xs text-text-muted">Milestone</span>
                  </div>
                </div>
                <div className="w-full h-[6px] rounded-full bg-[#372a2a] overflow-hidden">
                  <div className={`h-full ${c.barColor} rounded-full`} style={{ width: `${c.milestone}%` }} />
                </div>
              </div>
            </div>
          ))}
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
              <p className="text-4xl font-bold text-white tracking-tight mb-1">3</p>
              <p className="text-sm font-medium text-text-muted">Active Campaigns</p>
            </div>
            {/* Total Budget */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-surface-dark to-[#2a2020] border border-[#372a2a] shadow-sm relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="material-symbols-outlined text-text-muted">lock</span>
                <span className="text-[#0bda95] text-xs font-bold bg-[#0bda95]/10 px-2 py-0.5 rounded">+12%</span>
              </div>
              <p className="text-4xl font-bold text-white tracking-tight mb-1 relative z-10">$145,000</p>
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

          {/* Recent Activity */}
          <div className="p-5 rounded-xl bg-surface-dark border border-[#372a2a] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white">Recent Activity</h4>
              <button className="text-xs text-primary font-medium hover:underline">View All</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-gray-600 shrink-0" />
                <div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    <span className="text-white font-medium">Alice</span> approved milestone for <span className="text-white font-medium">Node Operator Grant</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">10 mins ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-gray-600 shrink-0" />
                <div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    New influencer <span className="text-white font-medium">@crypto_king</span> added to watchlist
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
