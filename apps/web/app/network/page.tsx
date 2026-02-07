import { getAgents, buildNetworkData } from "@/data/mappers";
import NetworkGraphClient from "@/components/NetworkGraphClient";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const agents = await getAgents();
  const { nodes, edges } = buildNetworkData(agents);

  return <NetworkGraphClient agents={agents} nodes={nodes} edges={edges} />;
}
