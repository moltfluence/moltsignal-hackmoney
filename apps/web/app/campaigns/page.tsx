import CampaignsView from "@/components/CampaignsView";
import TopBar from "@/components/TopBar";
import { getCampaigns } from "@/data/mappers";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="page">
      <TopBar
        title="Campaigns"
        subtitle="Performance settlement layer"
        showSearch={false}
        actionLabel="Create Campaign"
      />
      <div className="content-container">
        <CampaignsView campaigns={campaigns} />
      </div>
    </div>
  );
}
