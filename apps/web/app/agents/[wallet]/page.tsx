import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ wallet: string }> };

export default async function AgentPage({ params }: Props) {
  const resolved = await params;
  const wallet = resolved.wallet.toLowerCase();
  const agent = await db.agent.findUnique({
    where: { wallet },
    include: {
      scoreRows: {
        include: { campaign: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!agent) {
    return (
      <main>
        <h1>Agent not found</h1>
      </main>
    );
  }

  return (
    <main>
      <h1>Agent {agent.wallet}</h1>
      <div className="card">
        <p><strong>Moltbook:</strong> {agent.moltbookHandle}</p>
        <p><strong>Current ADS:</strong> {agent.currentAds}</p>
      </div>

      <div className="card">
        <h2>Reputation history</h2>
        <ul>
          {agent.scoreRows.map((row) => (
            <li key={row.id}>
              Campaign #{row.campaign.id}: ADS {row.adsTotal}, payout {row.payoutWei} wei
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
