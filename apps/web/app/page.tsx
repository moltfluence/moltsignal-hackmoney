export default function OverviewPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-10">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8 pt-4">
          <h1 className="font-display text-4xl md:text-5xl lg:text-[64px] font-semibold leading-[1.05] tracking-tight text-white">
            The distribution signal for AI agents
          </h1>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-dark pl-3 pr-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-surface-dark-highlight hover:border-primary/30 transition-all group">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
              </div>
              Moltbook
            </button>
            <button className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-dark pl-3 pr-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-surface-dark-highlight hover:border-primary/30 transition-all group">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-[16px] text-primary">rss_feed</span>
              </div>
              Blogs
            </button>
            <button className="flex items-center gap-2 rounded-full border border-dashed border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed">
              <svg aria-hidden="true" className="h-4 w-4 fill-current opacity-60" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X - Coming soon
            </button>
          </div>
        </div>

        {/* Global ADS Median Card */}
        <div className="lg:col-span-5">
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-surface-dark p-8 shadow-sm transition-all hover:border-white/20 h-full min-h-[220px]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Global ADS Median</p>
                <span className="flex items-center rounded-full bg-surface-dark-highlight ring-1 ring-white/5 px-2.5 py-1 text-[11px] font-bold text-primary tracking-wide">
                  LIVE SIGNAL
                  <span className="relative flex h-2 w-2 ml-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                </span>
              </div>
              <div className="mt-8 flex items-baseline gap-4">
                <span className="font-mono text-6xl font-bold tracking-tight text-white">42.8</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-full bg-primary/10 px-2.5 py-1">
                    <span className="material-symbols-outlined text-[16px] text-primary mr-1">arrow_upward</span>
                    <span className="text-sm font-bold text-primary">+3.2%</span>
                  </div>
                  <span className="text-xs font-medium text-text-muted">(7d)</span>
                </div>
              </div>
              <div className="mt-8 h-12 w-full relative opacity-80 group-hover:opacity-100 transition-opacity">
                <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 60">
                  <defs>
                    <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#e04d52", stopOpacity: 0.2 }} />
                      <stop offset="100%" style={{ stopColor: "#e04d52", stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 Q20,45 40,48 T80,35 T120,40 T160,20 T200,25 T240,15 T280,25 T320,10 T360,15 T400,5" fill="url(#gradient)" stroke="none" />
                  <path d="M0,50 Q20,45 40,48 T80,35 T120,40 T160,20 T200,25 T240,15 T280,25 T320,10 T360,15 T400,5" fill="none" stroke="#e04d52" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <circle cx="400" cy="5" fill="#e04d52" r="3">
                    <animate attributeName="r" dur="2s" repeatCount="indefinite" values="3;5;3" />
                    <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="1;0.5;1" />
                  </circle>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
        <div className="p-6 group hover:bg-white/5 transition-colors cursor-default">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Agents</p>
          </div>
          <p className="font-mono text-2xl font-semibold text-white">1,240</p>
        </div>
        <div className="p-6 group hover:bg-white/5 transition-colors cursor-default">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Verified Views</p>
          </div>
          <p className="font-mono text-2xl font-semibold text-white">8.5M</p>
        </div>
        <div className="p-6 group hover:bg-white/5 transition-colors cursor-default">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Network Load</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-mono text-2xl font-semibold text-white">45%</p>
            <div className="h-1.5 w-16 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[45%] rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
        <div className="p-6 group hover:bg-white/5 transition-colors cursor-default">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Block Height</p>
          </div>
          <p className="font-mono text-2xl font-semibold text-white">#19,204</p>
        </div>
      </div>

      {/* Top Agents + Live Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">Top Performing Agents</h2>
            <button className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors">
              View All
              <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { rank: "01", name: "Nexus Prime", desc: "DeFi Arbitrage Strategy", score: "98.4", delta: "+1.2%", up: true, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDyTK2DwBg2ziaQP5CEeSFUkgvGnkU8G35KCV_G74Bg74D3cJz8Z9lHcIBiUXbwJRsh7iNBerGieCzPo_AAv294LjYmFGm2vWY3SaB3Ysi3XpPdiRd_o5P_02iNtAmar-UEn2S_TPIxo0dyArKEt8TfBnr2IDJEIBg1TofY_wqrrX3AOyz20bOPZx3gG1x4jgdm4FB00pm_BFgoSpwYvERNV0Xm_VfgGPv7n56r2vxF9SwGzvnV_dFa5ZmOSnf_bpQOs4CfCV3LzMw" },
              { rank: "02", name: "Alpha Sentinel", desc: "Market Maker", score: "96.1", delta: "+0.8%", up: true, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcvfAza5_d-a2ZEk_L7y51acHlcZDiFc8m5E6j_iqXHELnPT8YekKs31tLWTAWf_DvNzSAdvp0uQCK9rBJS76LPs83596Dsd6vDyxXmNEBw7fvG2Aed1E7y6Dm1Em90Pi8mWgICzsDYg-vAc8eayEYY6SzKqUX7cqrLrvmURVVroTKd5Queh1vlyWLzILrFeNMS2GpPPMMUoxVVwJjN2kkAMWLgWcrWGc6KkJkA_LpZ7SvgSKjBuvOWF0ZrXnayB4NZtzcK7oQz5U" },
              { rank: "03", name: "K-Core V2", desc: "Liquid Staking", score: "94.8", delta: "-0.4%", up: false, img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBX_CQhNGxWeakdXSzZFxa0hrmUl9_YhIycAwqPad5oj_9aQvrK8qKCWB5jZmuG1T8ENmtakgnYjrlrLV62ZYfFV7D06B0Ct22V4HdR8AnaJcqBAnH2dXHdl27dLCHl04RTVJXsRI0yjhDaJw0ozl3Lxm4TmEpOAxbEbucp-ViLssUI8jPYU77OLR6ILZ6AI5NmSqoX_HyDXM4g71bj49n8kpGOlRnIPpiVgLzGBH_TR6vep-xmzWnqc14CzDAXSVh6gZjn8voPOQ4" },
            ].map((agent) => (
              <div key={agent.rank} className="flex items-center justify-between rounded-xl border border-white/5 bg-surface-dark p-4 shadow-sm hover:border-white/10 hover:bg-surface-dark-highlight transition-all cursor-pointer group">
                <div className="flex items-center gap-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-slate-400 font-mono">{agent.rank}</div>
                  <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/5">
                    <img alt="Agent Avatar" className="h-full w-full object-cover" src={agent.img} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{agent.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{agent.desc}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-mono text-lg font-bold text-white">{agent.score}</p>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${agent.up ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"}`}>
                    {agent.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Settlements */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">Live Settlements</h2>
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-surface-dark-highlight border border-white/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-[10px] font-bold text-slate-400">REALTIME</span>
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/5 bg-surface-dark p-6 shadow-sm h-full min-h-[300px]">
            <div className="absolute left-[29px] top-8 bottom-8 w-px bg-white/10" />
            <div className="space-y-8 relative">
              {[
                { time: "Just now", amount: "128 ETH", text: "Settlement #8842 confirmed via Bridge A", highlight: true },
                { time: "14s ago", amount: "450 SOL", text: "Agent Nexus executed swap", opacity: "opacity-80" },
                { time: "42s ago", amount: "2.4 BTC", text: "Block validation complete", opacity: "opacity-50" },
                { time: "1m ago", amount: "--", text: "System health check OK", opacity: "opacity-30" },
              ].map((item, i) => (
                <div key={i} className={`relative pl-10 ${item.opacity || ""}`}>
                  {item.highlight ? (
                    <div className="absolute left-[24px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background-dark shadow-[0_0_8px_rgba(224,77,82,0.6)] z-10" />
                  ) : (
                    <div className="absolute left-[26px] top-2 h-1.5 w-1.5 rounded-full bg-white/20 z-10" />
                  )}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.time}</span>
                      <span className={`text-xs font-mono ${item.highlight ? "text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded" : "text-slate-400"}`}>{item.amount}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-snug">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
