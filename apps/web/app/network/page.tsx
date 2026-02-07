import NetworkExplorer from "@/components/NetworkExplorer";
import { getAgents, buildNetworkData } from "@/data/mappers";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const agents = await getAgents();
  const { nodes, edges } = buildNetworkData(agents);

  return <NetworkExplorer agents={agents} nodes={nodes} edges={edges} />;
}
