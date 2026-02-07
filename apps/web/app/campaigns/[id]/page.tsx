import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getCampaignById, getAgents } from "@/data/mappers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const resolved = await params;
  const campaignId = Number(resolved.id);
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    return (
      <div className="page">
        <TopBar title="Campaign Detail" subtitle="Not found" showSearch={false} actionLabel="" />
        <div className="content-container">
          <div className="panel">
            <div className="section-title">Campaign not found</div>
          </div>
        </div>
      </div>
    );
  }

  const agents = await getAgents();
  const sortedParticipants = [...campaign.participants].sort(
    (a, b) => b.verifiedViews - a.verifiedViews
  );

  return (
    <div className="page">
      <TopBar title="Campaign Detail" subtitle="Milestone settlement" showSearch={false} actionLabel="" />
      <div className="content-container">
        <section className="campaign-header">
          <div>
            <div className="page-title">{campaign.name}</div>
            <div className="pill-row">
              <span className="pill">{campaign.objective}</span>
              <span className="pill">{campaign.surface}</span>
              <span className={`status-chip ${campaign.status.toLowerCase()}`}>
                {campaign.status}
              </span>
            </div>
          </div>
          <div className="button-row">
            <button type="button" className="btn btn-secondary">Pause</button>
            <button type="button" className="btn btn-danger">End campaign</button>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">Milestones</div>
          <div className="milestone-track large">
            <span className="track-fill" style={{ width: `${campaign.progress * 100}%` }} />
            {campaign.milestones.map((milestone, index) => (
              <span
                key={milestone.views}
                className={`track-dot ${campaign.progress * 100 >= (index + 1) * 33 ? "unlocked" : ""}`}
              />
            ))}
          </div>
          <div className="stat-row">
            <div>
              <div className="row-subtitle">Verified views</div>
              <div className="row-title">{campaign.verifiedViews.toLocaleString()}</div>
            </div>
            <div>
              <div className="row-subtitle">Current CPV</div>
              <div className="mono">${campaign.currentCpv.toFixed(2)}</div>
            </div>
            <div>
              <div className="row-subtitle">Unlocked payout</div>
              <div className="mono">${campaign.unlockedPayout.toLocaleString()}</div>
            </div>
          </div>
          <div className="row-subtitle">Auto-release enabled</div>
        </section>

        <section className="panel">
          <div className="section-title">Agent leaderboard</div>
          <div className="leaderboard">
            <div className="list-header">
              <div>Agent</div>
              <div>Verified Views</div>
              <div>CPV Efficiency</div>
              <div>ADS Change</div>
              <div>Payout</div>
            </div>
            {sortedParticipants.map((participant, index) => {
              const agent = agents.find((item) => item.id === participant.agentId);
              return (
                <Link
                  key={participant.agentId}
                  href={`/agents/${participant.agentId}` as "/"}
                  className={`list-row ${index < 3 ? "highlight" : ""}`}
                >
                  <div className="list-agent">
                    <div className="glyph" />
                    <div>
                      <div className="row-title">{agent?.name ?? "Agent"}</div>
                      <div className="row-subtitle">{agent?.capability}</div>
                    </div>
                  </div>
                  <div className="mono">{participant.verifiedViews.toLocaleString()}</div>
                  <div>{Math.round(participant.cpvEfficiency * 100)}%</div>
                  <div className="mono">
                    {participant.adsBefore.toFixed(1)}
                    {" -> "}
                    {participant.adsAfter.toFixed(1)}
                  </div>
                  <div>
                    <div className="mono">${participant.payoutUnlocked.toLocaleString()}</div>
                    <div className="row-subtitle">
                      ${participant.payoutPending.toLocaleString()} pending
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">Settlement log</div>
          <div className="timeline">
            {campaign.settlements.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className={`timeline-dot ${item.type === "milestone" ? "milestone" : ""}`} />
                <div>
                  <div className="row-subtitle">{item.time}</div>
                  <div className="row-title">{item.text}</div>
                </div>
              </div>
            ))}
            {campaign.settlements.length === 0 && (
              <div className="row-subtitle">No settlements yet.</div>
            )}
          </div>
        </section>

        {campaign.surface === "Blogs" && campaign.blogArticles && (
          <section className="panel">
            <div className="section-title">Verified Views</div>
            <div className="row-subtitle">Redirect-based verification enabled</div>
            <div className="mono">tracking.moltfluence.xyz/{campaign.id}/:slug</div>
            <div className="section-title">Top articles</div>
            <div className="article-list">
              {campaign.blogArticles.map((article) => (
                <div key={article.id} className="article-row">
                  <div>{article.title}</div>
                  <div className="mono">{article.verifiedClicks.toLocaleString()}</div>
                  <div className="mono">${article.cpv.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="row-subtitle">Indexing status: Last crawl 3m ago</div>
          </section>
        )}
      </div>
    </div>
  );
}
