import Link from "next/link";
import type { Campaign } from "@/data/types";
import StatCard from "./StatCard";

type CampaignsViewProps = {
  campaigns: Campaign[];
};

export default function CampaignsView({ campaigns }: CampaignsViewProps) {
  const totalLocked = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const totalUnlocked = campaigns.reduce(
    (sum, campaign) => sum + campaign.unlockedPayout,
    0
  );

  if (campaigns.length === 0) {
    return (
      <div className="panel">
        <div className="section-title">No campaigns yet</div>
        <p className="row-subtitle">Create your first campaign to get started.</p>
      </div>
    );
  }

  return (
    <div className="campaigns-layout">
      <div className="campaign-list">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/campaigns/${campaign.id}` as "/"}
            className="campaign-row"
          >
            <div>
              <div className="row-title">{campaign.name}</div>
              <div className="row-subtitle">{campaign.objective}</div>
              <div className="pill-row">
                <span className="pill">{campaign.surface}</span>
                <span className={`status-chip ${campaign.status.toLowerCase()}`}>
                  {campaign.status}
                </span>
              </div>
            </div>
            <div className="campaign-progress">
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: `${campaign.progress * 100}%` }}
                />
              </div>
              <div className="row-subtitle">
                {campaign.verifiedViews.toLocaleString()} verified views
              </div>
            </div>
            <div className="campaign-budget">
              <div className="mono">${campaign.budget.toLocaleString()}</div>
              <div className="row-subtitle">
                ${campaign.unlockedPayout.toLocaleString()} / ${campaign.totalPayout.toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="panel summary-panel">
        <div className="section-title">Summary</div>
        <div className="summary-grid">
          <StatCard label="Active campaigns" value={campaigns.length} />
          <StatCard label="Total budget locked" value={totalLocked / 1000} suffix="k" decimals={1} />
          <StatCard label="Total unlocked" value={totalUnlocked / 1000} suffix="k" decimals={1} />
        </div>
        {campaigns[0] && (
          <div className="next-milestone">
            <div className="row-title">Latest campaign</div>
            <div className="row-subtitle">{campaigns[0].name} - {campaigns[0].status}</div>
          </div>
        )}
      </div>
    </div>
  );
}
