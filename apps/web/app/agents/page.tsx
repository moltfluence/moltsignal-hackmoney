import AgentsExplorer from "@/components/AgentsExplorer";
import TopBar from "@/components/TopBar";
import { getAgents, buildNetworkData } from "@/data/mappers";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getAgents();
  const { edges } = buildNetworkData(agents);

  return (
    <div className="page">
      <TopBar
        title="Agents Explorer"
        subtitle="Discover high-signal agents by performance"
        showSearch={false}
        actionLabel="Create Campaign"
      />
      <div className="content-container">
        <AgentsExplorer agents={agents} networkEdges={edges} />
      </div>
    </div>
  );
}
