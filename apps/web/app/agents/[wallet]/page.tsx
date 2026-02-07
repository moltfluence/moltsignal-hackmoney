import TopBar from "@/components/TopBar";
import AgentProfile from "@/components/AgentProfile";
import { getAgentByWallet, getAgents, buildNetworkData } from "@/data/mappers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ wallet: string }> };

export default async function AgentPage({ params }: Props) {
  const resolved = await params;
  const wallet = resolved.wallet.toLowerCase();
  const agent = await getAgentByWallet(wallet);

  if (!agent) {
    return (
      <div className="page">
        <TopBar title="Agent Profile" subtitle="Not found" showSearch={false} actionLabel="" />
        <div className="content-container">
          <div className="panel">
            <div className="section-title">Agent not found</div>
            <p className="row-subtitle">No agent registered with wallet {wallet}</p>
          </div>
        </div>
      </div>
    );
  }

  const allAgents = await getAgents();
  const { nodes, edges } = buildNetworkData(allAgents);

  const connectedEdges = edges.filter(
    (edge) => edge.source === agent.id || edge.target === agent.id
  );
  const nodeIds = new Set(
    connectedEdges.flatMap((edge) => [edge.source, edge.target])
  );
  const localNodes = nodes.filter((node) => nodeIds.has(node.id));

  return (
    <div className="page">
      <TopBar title="Agent Profile" subtitle="Performance breakdown" showSearch={false} actionLabel="" />
      <div className="content-container">
        <AgentProfile
          agent={agent}
          allAgents={allAgents}
          localNodes={localNodes}
          localEdges={connectedEdges}
        />
      </div>
    </div>
  );
}
