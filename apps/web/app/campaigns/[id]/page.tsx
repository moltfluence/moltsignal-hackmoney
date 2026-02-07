import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignPage({ params }: Props) {
  const resolved = await params;
  const campaignId = Number(resolved.id);

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      participants: { include: { agent: true } },
      proofs: true,
      yellowSessions: { include: { microRewards: true, agent: true } },
      scoreRuns: { include: { rows: true }, orderBy: { createdAt: "desc" }, take: 1 },
      settlements: { orderBy: { createdAt: "desc" }, take: 1 },
      erc8004Feedback: { include: { agent: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!campaign) {
    return (
      <main>
        <h1>Campaign not found</h1>
      </main>
    );
  }

  const latest = campaign.scoreRuns[0];

  return (
    <main>
      <h1>Campaign #{campaign.id}</h1>
      <div className="card">
        <p><strong>Objective:</strong> {campaign.objective}</p>
        <p><strong>Status:</strong> {campaign.status}</p>
        <p><strong>Chain campaign id:</strong> {campaign.chainCampaignId.toString()}</p>
        <p><strong>Budget (atomic):</strong> {campaign.budgetWei} (Arc native USDC, 18 decimals)</p>
        <p><strong>Premium:</strong> {campaign.premium ? "yes" : "no"}</p>
        <p><strong>Yellow enabled:</strong> {campaign.yellowEnabled ? "yes" : "no"}</p>
      </div>

      <div className="card">
        <h2>Participants</h2>
        <ul>
          {campaign.participants.map((participant) => (
            <li key={participant.id}>{participant.agent.wallet} ({participant.agent.moltbookHandle})</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Proof submissions</h2>
        <ul>
          {campaign.proofs.map((proof) => (
            <li key={proof.id}>
              <a href={proof.postUrl} target="_blank">{proof.postUrl}</a> - <code>{proof.proofHash}</code>
            </li>
          ))}
        </ul>
      </div>

      {campaign.yellowEnabled ? (
        <div className="card">
          <h2>Yellow micro-rewards</h2>
          {campaign.yellowSessions.length === 0 ? (
            <p>No Yellow sessions yet (paid on first valid proof).</p>
          ) : (
            <ul>
              {campaign.yellowSessions.map((session) => (
                <li key={session.id}>
                  {session.agent.wallet} — session <code>{session.sessionId}</code> ({session.status})
                  {session.microRewards.length > 0 ? (
                    <ul>
                      {session.microRewards.map((r) => (
                        <li key={r.id}>
                          {r.reason}: {r.amount} {r.tokenSymbol} — transfer <code>{r.yellowTransferId ?? "n/a"}</code>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="card">
        <h2>Latest leaderboard snapshot</h2>
        {latest ? (
          <ul>
            {latest.rows.map((row) => (
              <li key={row.id}>
                ADS {row.adsTotal} - payout {row.payoutWei} wei - proof <code>{row.proofHash}</code>
                {" "} | network: {row.network.toFixed(1)} (unique {row.networkUniqueActors}, entropy {row.networkEntropy.toFixed(2)}, topShare {row.networkTopShare.toFixed(2)})
              </li>
            ))}
          </ul>
        ) : (
          <p>No score run yet.</p>
        )}
      </div>

      {campaign.erc8004Feedback.length > 0 ? (
        <div className="card">
          <h2>ERC-8004 Reputation Feedback</h2>
          <ul>
            {campaign.erc8004Feedback.map((fb) => (
              <li key={fb.id}>
                {fb.agent.wallet} ({fb.agent.moltbookHandle}) — ADS {fb.value} bp
                — NFT #{fb.nftTokenId.toString()}
                — tx <code>{fb.txHash}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h2>Settlement</h2>
        {campaign.settlements[0] ? (
          <p>
            tx: <code>{campaign.settlements[0].txHash}</code>
          </p>
        ) : (
          <p>Not settled yet.</p>
        )}
      </div>
    </main>
  );
}
