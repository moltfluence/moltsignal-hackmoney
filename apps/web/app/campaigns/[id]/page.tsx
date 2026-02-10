import Link from "next/link";
import { getCampaignById, getAgentNameMap, getYellowSessionsForCampaign, getErc8004FeedbackForCampaign } from "@/data/mappers";
import SettleCampaignButton from "./SettleCampaignButton";
import LiveLeaderboard from "./LiveLeaderboard";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Settling: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const resolved = await params;
  const campaignId = Number(resolved.id);
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    return (
      <div className="mx-auto max-w-[1400px] py-20 text-center">
        <span className="material-symbols-outlined text-5xl text-text-muted mb-4">search_off</span>
        <h2 className="text-xl font-bold text-white mb-2">Campaign not found</h2>
        <p className="text-text-muted text-sm">Campaign #{campaignId} does not exist</p>
        <Link href="/campaigns" className="mt-4 inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const participantWallets = campaign.participants.map((p) => p.agentId);
  const [agentNames, yellowSessions, erc8004Feedback] = await Promise.all([
    getAgentNameMap(participantWallets),
    getYellowSessionsForCampaign(campaignId),
    getErc8004FeedbackForCampaign(campaignId),
  ]);
  const sortedParticipants = [...campaign.participants].sort(
    (a, b) => b.verifiedViews - a.verifiedViews,
  );
  const milestone = Math.round(campaign.progress * 100);
  const totalMicroRewards = yellowSessions.reduce((s, sess) => s + sess.microRewards.length, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-4">
          <Link href="/campaigns" className="hover:text-white transition-colors">Campaigns</Link>
          <span className="text-white/20">/</span>
          <span className="text-white font-medium truncate">{campaign.name}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{campaign.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[campaign.status] ?? STATUS_STYLES.Active}`}>{campaign.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <SettleCampaignButton campaignId={String(campaignId)} />
          </div>
        </div>
      </div>

      {/* Stats + Progress */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Verified Views</p>
          <span className="font-mono text-2xl font-bold text-white">{campaign.verifiedViews.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Budget</p>
          <span className="font-mono text-2xl font-bold text-white">${campaign.budget.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Current CPV</p>
          <span className="font-mono text-2xl font-bold text-white">${campaign.currentCpv.toFixed(2)}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Unlocked</p>
          <span className="font-mono text-2xl font-bold text-emerald-400">${campaign.unlockedPayout.toLocaleString()}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-white/10 bg-surface-dark p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Progress</span>
          <span className="text-sm font-bold text-white font-mono">{milestone}%</span>
        </div>
        <div className="relative w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${milestone}%` }} />
        </div>
      </div>

      {/* Live ADS Leaderboard */}
      <LiveLeaderboard campaignId={String(campaignId)} />

      {/* Static Leaderboard */}
      {sortedParticipants.length > 0 && (
        <div className="rounded-xl bg-surface-dark border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Participants</h2>
            <span className="text-xs text-text-muted">{sortedParticipants.length} agents</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-text-muted uppercase tracking-wider border-b border-white/5">
                  <th className="text-left px-5 py-2.5 font-medium">#</th>
                  <th className="text-left px-5 py-2.5 font-medium">Agent</th>
                  <th className="text-right px-5 py-2.5 font-medium">Views</th>
                  <th className="text-right px-5 py-2.5 font-medium">ADS</th>
                  <th className="text-right px-5 py-2.5 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((participant, index) => {
                  const name = agentNames.get(participant.agentId);
                  const shortAddr = `${participant.agentId.slice(0, 6)}...${participant.agentId.slice(-4)}`;
                  return (
                    <tr key={participant.agentId} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold text-text-muted font-mono">{index + 1}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/agents/${participant.agentId}` as "/"} className="flex items-center gap-2.5 group">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                            {(name ?? "A").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium group-hover:text-primary transition-colors">{name ?? "Agent"}</p>
                            <p className="text-text-muted text-[10px]">{shortAddr}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-white text-xs">{participant.verifiedViews.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs">
                        <span className="text-text-muted">{participant.adsBefore.toFixed(1)}</span>
                        <span className="text-white/20 mx-0.5">&rarr;</span>
                        <span className={participant.adsAfter > participant.adsBefore ? "text-emerald-400" : "text-primary"}>{participant.adsAfter.toFixed(1)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-white text-xs font-medium">${participant.payoutUnlocked.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yellow Network Sessions */}
      {yellowSessions.length > 0 && (
        <div className="rounded-xl bg-surface-dark border border-yellow-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-yellow-500/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-400 text-base">bolt</span>
              Yellow Network
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{totalMicroRewards} rewards</span>
          </div>
          <div className="divide-y divide-yellow-500/10">
            {yellowSessions.map((sess) => (
              <div key={sess.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${sess.status === "OPEN" ? "bg-emerald-500" : "bg-slate-500"}`} />
                    <span className="text-sm text-white font-medium">{sess.agentName}</span>
                    <span className="text-[10px] text-text-muted font-mono">{sess.agentWallet.slice(0, 6)}...{sess.agentWallet.slice(-4)}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sess.status === "OPEN" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>{sess.status}</span>
                </div>
                {sess.microRewards.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {sess.microRewards.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{r.reason.replace(/_/g, " ")}</span>
                        <span className="text-white font-mono">{r.amount} {r.tokenSymbol}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERC-8004 Feedback */}
      {erc8004Feedback.length > 0 && (
        <div className="rounded-xl bg-surface-dark border border-blue-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-500/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-base">verified</span>
              ERC-8004 Feedback
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{erc8004Feedback.length} entries</span>
          </div>
          <div className="divide-y divide-blue-500/10">
            {erc8004Feedback.map((f) => (
              <div key={f.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white font-medium">{f.agentName}</span>
                  <span className="text-[10px] text-text-muted font-mono">NFT #{f.nftTokenId}</span>
                  <div className="flex gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">{f.tag1}</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">{f.tag2}</span>
                  </div>
                </div>
                <span className="font-mono text-white font-bold text-sm">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement Log */}
      {campaign.settlements.length > 0 && (
        <div className="rounded-xl bg-surface-dark border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Settlements</h2>
          </div>
          <div className="divide-y divide-white/5">
            {campaign.settlements.map((item) => (
              <div key={item.id} className="px-5 py-3.5 flex items-center justify-between">
                <p className="text-sm text-white">{item.text}</p>
                <span className="text-xs text-text-muted">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
