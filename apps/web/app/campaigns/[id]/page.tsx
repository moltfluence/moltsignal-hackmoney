import Link from "next/link";
import { getCampaignById, getAgents, getYellowSessionsForCampaign, getErc8004FeedbackForCampaign } from "@/data/mappers";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Settling: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Complete: "bg-green-500/10 text-green-500 border-green-500/20",
};

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const resolved = await params;
  const campaignId = Number(resolved.id);
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    return (
      <div className="mx-auto max-w-[1400px] py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-text-muted mb-4">search_off</span>
        <h2 className="text-2xl font-bold text-white mb-2">Campaign not found</h2>
        <p className="text-text-muted">Campaign #{campaignId} does not exist</p>
        <Link href="/campaigns" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const [agents, yellowSessions, erc8004Feedback] = await Promise.all([
    getAgents(),
    getYellowSessionsForCampaign(campaignId),
    getErc8004FeedbackForCampaign(campaignId),
  ]);
  const sortedParticipants = [...campaign.participants].sort(
    (a, b) => b.verifiedViews - a.verifiedViews,
  );
  const milestone = Math.round(campaign.progress * 100);
  const totalMicroRewards = yellowSessions.reduce((s, sess) => s + sess.microRewards.length, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
            <Link href="/campaigns" className="hover:text-white transition-colors">Campaigns</Link>
            <span>/</span>
            <span className="text-white">{campaign.name}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">{campaign.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-dark border border-[#372a2a] text-xs font-medium text-slate-300">{campaign.objective}</span>
            <span className="px-3 py-1 rounded-full bg-surface-dark border border-[#372a2a] text-xs font-medium text-slate-300">{campaign.surface}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[campaign.status] ?? STATUS_STYLES.Active}`}>{campaign.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="px-4 py-2 rounded-lg border border-[#372a2a] text-sm font-medium text-slate-300 hover:bg-surface-dark hover:text-white transition-colors">Pause</button>
          <button type="button" className="px-4 py-2 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors">End Campaign</button>
        </div>
      </div>

      {/* Milestone Progress */}
      <div className="p-6 rounded-xl bg-surface-dark border border-[#372a2a]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Milestone Progress</h2>
          <span className="text-xs text-text-muted">Auto-release enabled</span>
        </div>
        <div className="relative w-full h-3 rounded-full bg-[#372a2a] mb-6 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all shadow-[0_0_10px_rgba(224,77,82,0.4)]" style={{ width: `${milestone}%` }} />
          {campaign.milestones.map((m, i) => (
            <div key={m.views} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${m.payoutPercent}%` }}>
              <div className={`w-4 h-4 rounded-full border-2 ${milestone >= m.payoutPercent ? "bg-primary border-primary" : "bg-[#372a2a] border-slate-600"} -translate-x-1/2`} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Verified Views</p>
            <p className="text-2xl font-bold text-white font-mono">{campaign.verifiedViews.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Current CPV</p>
            <p className="text-2xl font-bold text-white font-mono">${campaign.currentCpv.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Budget</p>
            <p className="text-2xl font-bold text-white font-mono">${campaign.budget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Unlocked Payout</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">${campaign.unlockedPayout.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="rounded-xl bg-surface-dark border border-[#372a2a] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#372a2a] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Agent Leaderboard</h2>
          <span className="text-xs text-text-muted">{sortedParticipants.length} agents</span>
        </div>
        {sortedParticipants.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-muted text-sm">No agents have joined this campaign yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-[#372a2a]">
                  <th className="text-left px-6 py-3 font-medium">#</th>
                  <th className="text-left px-6 py-3 font-medium">Agent</th>
                  <th className="text-right px-6 py-3 font-medium">Views</th>
                  <th className="text-right px-6 py-3 font-medium">CPV Eff.</th>
                  <th className="text-right px-6 py-3 font-medium">ADS Change</th>
                  <th className="text-right px-6 py-3 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((participant, index) => {
                  const agent = agents.find((item) => item.id === participant.agentId);
                  return (
                    <tr key={participant.agentId} className="border-b border-[#372a2a]/50 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${index < 3 ? "bg-primary/10 text-primary" : "bg-white/5 text-slate-400"}`}>{index + 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/agents/${participant.agentId}` as "/"} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {(agent?.name ?? "A").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium group-hover:text-primary transition-colors">{agent?.name ?? "Agent"}</p>
                            <p className="text-text-muted text-xs">{agent?.idHash ?? participant.agentId.slice(0, 10)}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white">{participant.verifiedViews.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-white">{Math.round(participant.cpvEfficiency * 100)}%</td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className="text-text-muted">{participant.adsBefore.toFixed(1)}</span>
                        <span className="text-text-muted mx-1">→</span>
                        <span className={participant.adsAfter > participant.adsBefore ? "text-emerald-400" : "text-primary"}>{participant.adsAfter.toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-mono text-white font-medium">${participant.payoutUnlocked.toLocaleString()}</p>
                        {participant.payoutPending > 0 && (
                          <p className="text-text-muted text-xs">${participant.payoutPending.toLocaleString()} pending</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yellow Network Sessions */}
      {yellowSessions.length > 0 && (
        <div className="p-6 rounded-xl bg-surface-dark border border-yellow-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-400 text-lg">bolt</span>
              Yellow Network Sessions
            </h2>
            <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              {totalMicroRewards} micro-rewards
            </span>
          </div>
          <div className="space-y-4">
            {yellowSessions.map((sess) => (
              <div key={sess.id} className="p-4 rounded-lg bg-black/20 border border-[#372a2a]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${sess.status === "OPEN" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : sess.status === "CLOSED" ? "bg-slate-500" : "bg-yellow-500"}`} />
                    <span className="text-sm text-white font-medium">{sess.agentName}</span>
                    <span className="text-xs text-text-muted font-mono">{sess.agentWallet.slice(0, 6)}...{sess.agentWallet.slice(-4)}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${sess.status === "OPEN" ? "bg-emerald-500/10 text-emerald-400" : sess.status === "CLOSED" ? "bg-slate-500/10 text-slate-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    {sess.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase">Session ID</p>
                    <p className="text-xs text-white font-mono truncate">{sess.sessionId}</p>
                  </div>
                  {sess.settleTxHash && (
                    <div>
                      <p className="text-[10px] text-text-muted uppercase">Settlement Tx</p>
                      <p className="text-xs text-primary font-mono truncate">{sess.settleTxHash}</p>
                    </div>
                  )}
                </div>
                {sess.microRewards.length > 0 && (
                  <div className="border-t border-[#372a2a] pt-3">
                    <p className="text-[10px] text-text-muted uppercase mb-2">Micro-Rewards ({sess.microRewards.length})</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {sess.microRewards.slice(0, 5).map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[12px] text-yellow-400">payments</span>
                            <span className="text-slate-300">{r.reason.replace(/_/g, " ")}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-mono">{r.amount} {r.tokenSymbol}</span>
                            <span className="text-text-muted">{r.createdAt}</span>
                          </div>
                        </div>
                      ))}
                      {sess.microRewards.length > 5 && (
                        <p className="text-[10px] text-text-muted text-center">+ {sess.microRewards.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERC-8004 Feedback */}
      {erc8004Feedback.length > 0 && (
        <div className="p-6 rounded-xl bg-surface-dark border border-blue-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-lg">verified</span>
              ERC-8004 Reputation Feedback
            </h2>
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {erc8004Feedback.length} entries
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-[#372a2a]">
                  <th className="text-left px-4 py-2 font-medium">Agent</th>
                  <th className="text-left px-4 py-2 font-medium">NFT ID</th>
                  <th className="text-right px-4 py-2 font-medium">ADS Score</th>
                  <th className="text-left px-4 py-2 font-medium">Tags</th>
                  <th className="text-left px-4 py-2 font-medium">Tx Hash</th>
                  <th className="text-right px-4 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {erc8004Feedback.map((f) => (
                  <tr key={f.id} className="border-b border-[#372a2a]/50 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{f.agentName}</td>
                    <td className="px-4 py-3 font-mono text-text-muted">#{f.nftTokenId}</td>
                    <td className="px-4 py-3 text-right font-mono text-white font-bold">{f.value}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">{f.tag1}</span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-medium">{f.tag2}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-primary text-xs truncate max-w-[120px]">{f.txHash}</td>
                    <td className="px-4 py-3 text-right text-text-muted text-xs">{f.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settlement Log */}
      <div className="p-6 rounded-xl bg-surface-dark border border-[#372a2a]">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Settlement Log</h2>
        {campaign.settlements.length === 0 ? (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-3xl text-text-muted mb-2">receipt_long</span>
            <p className="text-text-muted text-sm">No settlements recorded yet</p>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-[#372a2a]" />
            <div className="space-y-6">
              {campaign.settlements.map((item, i) => (
                <div key={item.id} className="relative">
                  <div className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 ${i === 0 ? "border-primary bg-background-dark shadow-[0_0_8px_rgba(224,77,82,0.6)]" : "border-slate-600 bg-[#372a2a]"}`} />
                  <div>
                    <p className="text-xs text-text-muted mb-1">{item.time}</p>
                    <p className="text-sm text-white font-medium">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
