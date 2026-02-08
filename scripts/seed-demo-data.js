require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data for MoltSignal...\n");

  // Create mock agents
  const agents = [
    { wallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", handle: "moltbot-alpha", ads: 87 },
    { wallet: "0x1234567890123456789012345678901234567890", handle: "clawbot-v2", ads: 92 },
    { wallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", handle: "signalai-recon", ads: 78 },
    { wallet: "0x9876543210987654321098765432109876543210", handle: "drift-oracle", ads: 65 },
    { wallet: "0xfedcbafedcbafedcbafedcbafedcbafedcbafed", handle: "pulse-trader", ads: 71 },
    { wallet: "0x1111111111111111111111111111111111111111", handle: "agentzero", ads: 83 },
    { wallet: "0x2222222222222222222222222222222222222222", handle: "neural-scout", ads: 56 },
    { wallet: "0x3333333333333333333333333333333333333333", handle: "quantum-probe", ads: 94 },
  ];

  console.log("📦 Creating agents...");
  for (const agent of agents) {
    await db.agent.upsert({
      where: { wallet: agent.wallet },
      create: {
        wallet: agent.wallet,
        moltbookHandle: agent.handle,
        currentAds: agent.ads,
      },
      update: {
        currentAds: agent.ads,
      },
    });
    console.log(`  ✓ ${agent.handle} (ADS: ${agent.ads})`);
  }

  // Create campaigns
  console.log("\n🎯 Creating campaigns...");

  const campaign1 = await db.campaign.upsert({
    where: { chainCampaignId: BigInt(1) },
    create: {
      chainCampaignId: BigInt(1),
      sponsorWallet: "0x75C6cFdEDbEb6b34e4558AF2D0aFdBF19b273B09",
      objective: "Promote DeFi yields on Moltbook - Target 100k views",
      budgetWei: "5000000000000000000", // 5 ETH
      premium: true,
      yellowEnabled: true,
      minProofsPerAgent: 2,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      status: "ACTIVE",
    },
    update: {},
  });
  console.log(`  ✓ Campaign #1: ${campaign1.objective.substring(0, 50)}...`);

  const campaign2 = await db.campaign.upsert({
    where: { chainCampaignId: BigInt(2) },
    create: {
      chainCampaignId: BigInt(2),
      sponsorWallet: "0x8888888888888888888888888888888888888888",
      objective: "AI Agent coordination research - Share insights on decentralized agent networks",
      budgetWei: "3000000000000000000", // 3 ETH
      premium: false,
      yellowEnabled: false,
      minProofsPerAgent: 1,
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: "ACTIVE",
    },
    update: {},
  });
  console.log(`  ✓ Campaign #2: ${campaign2.objective.substring(0, 50)}...`);

  const campaign3 = await db.campaign.upsert({
    where: { chainCampaignId: BigInt(3) },
    create: {
      chainCampaignId: BigInt(3),
      sponsorWallet: "0x9999999999999999999999999999999999999999",
      objective: "ERC-8004 agent reputation standard awareness campaign",
      budgetWei: "2000000000000000000", // 2 ETH
      premium: false,
      yellowEnabled: true,
      minProofsPerAgent: 1,
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Ended 1 day ago
      status: "SETTLED",
    },
    update: {},
  });
  console.log(`  ✓ Campaign #3: ${campaign3.objective.substring(0, 50)}... (SETTLED)`);

  // Add campaign participants
  console.log("\n👥 Adding campaign participants...");
  const agentRecords = await db.agent.findMany();

  // Campaign 1 - 5 agents
  for (let i = 0; i < 5; i++) {
    await db.campaignParticipant.upsert({
      where: {
        campaignId_agentId: {
          campaignId: campaign1.id,
          agentId: agentRecords[i].id,
        },
      },
      create: {
        campaignId: campaign1.id,
        agentId: agentRecords[i].id,
      },
      update: {},
    });
  }
  console.log(`  ✓ Campaign #1: 5 participants`);

  // Campaign 2 - 3 agents
  for (let i = 2; i < 5; i++) {
    await db.campaignParticipant.upsert({
      where: {
        campaignId_agentId: {
          campaignId: campaign2.id,
          agentId: agentRecords[i].id,
        },
      },
      create: {
        campaignId: campaign2.id,
        agentId: agentRecords[i].id,
      },
      update: {},
    });
  }
  console.log(`  ✓ Campaign #2: 3 participants`);

  // Campaign 3 - 4 agents (settled)
  for (let i = 0; i < 4; i++) {
    await db.campaignParticipant.upsert({
      where: {
        campaignId_agentId: {
          campaignId: campaign3.id,
          agentId: agentRecords[i].id,
        },
      },
      create: {
        campaignId: campaign3.id,
        agentId: agentRecords[i].id,
      },
      update: {},
    });
  }
  console.log(`  ✓ Campaign #3: 4 participants (settled)`);

  // Add proofs
  console.log("\n📤 Creating proof submissions...");
  let proofCount = 0;

  for (let i = 0; i < 5; i++) {
    await db.proofSubmission.create({
      data: {
        campaignId: campaign1.id,
        agentId: agentRecords[i].id,
        postUrl: `https://www.moltbook.com/m/defi-yields-${i + 1}`,
        fetchedSnapshotJson: {
          views: 5000 + Math.floor(Math.random() * 10000),
          likes: 100 + Math.floor(Math.random() * 500),
          reposts: 20 + Math.floor(Math.random() * 100),
        },
        proofHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        valid: true,
      },
    });
    proofCount++;
  }
  console.log(`  ✓ Campaign #1: 5 proofs submitted`);

  // Add settlements for campaign 3
  console.log("\n💰 Creating settlement records...");
  await db.settlement.create({
    data: {
      campaignId: campaign3.id,
      txHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      blockNumber: BigInt(12345678),
      oracleSigner: "0x75C6cFdEDbEb6b34e4558AF2D0aFdBF19b273B09",
    },
  });
  console.log(`  ✓ Settlement for campaign #3`);

  // Add score runs for settled campaign
  console.log("\n📊 Creating score runs...");
  const scoreRun = await db.scoreRun.create({
    data: {
      campaignId: campaign3.id,
      weightsJson: {
        distribution: 0.4,
        engagement: 0.25,
        reliability: 0.2,
        network: 0.15,
      },
      scorerVersion: "v1.1",
    },
  });

  for (let i = 0; i < 4; i++) {
    await db.scoreRow.create({
      data: {
        scoreRunId: scoreRun.id,
        campaignId: campaign3.id,
        agentId: agentRecords[i].id,
        distribution: 70 + Math.random() * 25,
        engagement: 60 + Math.random() * 30,
        reliability: 80 + Math.random() * 15,
        network: 50 + Math.random() * 40,
        networkUniqueActors: Math.floor(50 + Math.random() * 200),
        networkTopShare: Math.random() * 0.3,
        networkEntropy: 0.5 + Math.random() * 0.5,
        networkInfluence: Math.random() * 100,
        adsTotal: agents[i].ads,
        payoutWei: String(BigInt(Math.floor(0.3 * 1e18 + Math.random() * 0.7 * 1e18))),
        proofHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      },
    });
  }
  console.log(`  ✓ Score rows for 4 agents in campaign #3`);

  console.log("\n✅ Demo data seeded successfully!");
  console.log("\n📈 Summary:");
  console.log(`   • ${agents.length} agents created`);
  console.log(`   • 3 campaigns (1 settled, 2 active)`);
  console.log(`   • ${proofCount} proofs submitted`);
  console.log(`   • 1 settlement recorded`);
  console.log(`   • 4 agents scored\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
