export default function NetworkPage() {
  return (
    <div className="flex flex-col h-full -m-6 md:-m-10 lg:-m-12 relative overflow-hidden">
      {/* Graph Background */}
      <div className="absolute inset-0 z-0 overflow-hidden graph-bg">
        <svg className="w-full h-full opacity-80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="edge-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" style={{ stopColor: "#334155", stopOpacity: 0.2 }} />
              <stop offset="50%" style={{ stopColor: "#475569", stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: "#334155", stopOpacity: 0.2 }} />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="url(#edge-gradient)" strokeWidth="1" />
          <line x1="50%" y1="50%" x2="80%" y2="40%" stroke="url(#edge-gradient)" strokeWidth="2" />
          <line x1="50%" y1="50%" x2="40%" y2="70%" stroke="url(#edge-gradient)" strokeWidth="1" />
          <line x1="50%" y1="50%" x2="60%" y2="20%" stroke="url(#edge-gradient)" strokeWidth="1.5" />
          <line x1="20%" y1="30%" x2="15%" y2="60%" stroke="url(#edge-gradient)" strokeWidth="1" />
          <line x1="80%" y1="40%" x2="85%" y2="70%" stroke="url(#edge-gradient)" strokeWidth="1" />
          <line x1="40%" y1="70%" x2="15%" y2="60%" stroke="url(#edge-gradient)" strokeWidth="0.5" />
          <circle className="node-pulse cursor-pointer" cx="50%" cy="50%" r="24" fill="#1e293b" stroke="#e04d52" strokeWidth="2" />
          <circle cx="50%" cy="50%" r="8" fill="#e04d52" />
          <circle className="cursor-pointer hover:stroke-primary" cx="20%" cy="30%" r="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <circle className="cursor-pointer hover:stroke-primary" cx="80%" cy="40%" r="16" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <circle className="cursor-pointer hover:stroke-primary" cx="40%" cy="70%" r="10" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <circle className="cursor-pointer hover:stroke-primary" cx="60%" cy="20%" r="14" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <circle className="cursor-pointer hover:stroke-primary" cx="15%" cy="60%" r="8" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <circle className="cursor-pointer hover:stroke-primary" cx="85%" cy="70%" r="10" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        </svg>

        {/* Zoom Controls */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-10">
          <button className="w-10 h-10 bg-surface-dark border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button className="w-10 h-10 bg-surface-dark border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined text-[20px]">remove</span>
          </button>
          <button className="w-10 h-10 bg-surface-dark border border-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-md mt-2">
            <span className="material-symbols-outlined text-[20px]">center_focus_strong</span>
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-8 right-8 z-10 hidden md:flex items-center gap-6 px-4 py-2 rounded-full bg-surface-dark/80 border border-slate-700/30 backdrop-blur-md text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(224,77,82,0.6)]" />
            <span>Active Pulse</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Dormant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-500" />
            <span>Connection</span>
          </div>
        </div>
      </div>

      {/* Overlay Content */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none w-full">
        {/* Header */}
        <header className="w-full px-6 py-4 flex justify-between items-center pointer-events-auto">
          <div className="flex items-center text-sm text-slate-500 font-mono">
            <span className="text-slate-400">Network</span>
            <span className="mx-2">/</span>
            <span className="text-white">Global Graph</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-[720px] px-4 pointer-events-auto">
          <div className="bg-surface-dark/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row items-stretch">
            <div className="flex-1 flex items-center px-4 py-3 md:py-0 border-b md:border-b-0 md:border-r border-slate-700/50 group">
              <span className="material-symbols-outlined text-slate-500 group-focus-within:text-primary transition-colors">search</span>
              <input className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 focus:outline-none text-sm h-full py-3 px-2" placeholder="Search agent ID, hash, or node..." type="text" />
            </div>
            <div className="flex items-center justify-between gap-0 bg-black/20 md:bg-transparent">
              <div className="flex items-center h-full">
                <button className="h-full px-4 py-3 md:py-0 flex items-center gap-2 text-xs font-medium text-slate-300 hover:bg-white/5 border-r border-slate-700/50 transition-colors whitespace-nowrap">
                  <span className="material-symbols-outlined text-[16px] text-primary">filter_list</span>
                  <span>Reputation &gt; 50</span>
                </button>
              </div>
              <button className="h-full px-5 py-3 md:py-0 bg-primary hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center">
                Explore
              </button>
            </div>
          </div>
        </div>

        {/* Node Detail Panel */}
        <div className="absolute top-20 bottom-8 right-6 w-[360px] flex flex-col pointer-events-auto">
          <div className="flex-1 flex flex-col bg-surface-dark/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-start bg-gradient-to-b from-white/5 to-transparent">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active Node</span>
                </div>
                <h2 className="text-xl font-bold text-white font-mono tracking-tight">Agent-0x4a...9f</h2>
                <p className="text-xs text-slate-500 mt-1">Last active: 2s ago • Block #8921102</p>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* ADS Score */}
              <div className="p-6">
                <div className="flex items-end justify-between mb-2">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">ADS Reputation Score</h3>
                  <span className="text-xs font-bold text-primary flex items-center">
                    <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                    +12.5%
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white tracking-tighter tabular-nums">894</span>
                  <span className="text-lg text-slate-500 font-medium">/ 1000</span>
                </div>
                <div className="h-10 w-full mt-4 flex items-end gap-[2px]">
                  {[40, 60, 30, 70, 50, 80, 90, 75].map((h, i) => (
                    <div key={i} className={`w-full rounded-sm ${i === 6 ? "bg-primary shadow-[0_0_8px_rgba(224,77,82,0.5)]" : "bg-slate-800 hover:bg-primary/50"} transition-colors`} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-800 mx-6" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 p-6">
                {[
                  { label: "Total Stake", value: "24,500 MLT" },
                  { label: "Uptime", value: "99.98%" },
                  { label: "Tx Volume", value: "$1.2M" },
                  { label: "Latency", value: "12ms", valueColor: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-black/20 rounded-lg p-3 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-medium mb-1">{s.label}</div>
                    <div className={`text-sm font-mono ${s.valueColor || "text-slate-200"}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-slate-800 mx-6" />

              {/* Connections */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Direct Connections (12)</h3>
                  <button className="text-[10px] text-primary hover:text-white transition-colors uppercase font-bold">View All</button>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { id: "0xB", addr: "0xB2...8c", type: "Validator Node", pct: 76, color: "bg-slate-500" },
                    { id: "0x9", addr: "0x9a...11", type: "Compute Agent", pct: 42, color: "bg-slate-500" },
                    { id: "0xF", addr: "0xF4...3d", type: "Storage Node", pct: 89, color: "bg-primary" },
                  ].map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-300">{c.id}</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-mono text-slate-200 group-hover:text-primary transition-colors">{c.addr}</span>
                          <span className="text-[10px] text-slate-500">{c.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{c.pct}%</span>
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${c.color} ${c.color === "bg-primary" ? "shadow-[0_0_5px_rgba(224,77,82,0.5)]" : ""}`} style={{ width: `${c.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-700/50 bg-black/20">
              <button className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-slate-700/50 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Open Full Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
