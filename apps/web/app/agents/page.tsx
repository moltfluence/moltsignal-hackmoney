import { getAgents } from "@/data/mappers";
import AgentsExplorerClient from "@/components/AgentsExplorerClient";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getAgents();

  return <AgentsExplorerClient agents={agents} />;
}
