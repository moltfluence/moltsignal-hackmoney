const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // Create a test campaign directly in DB
  const campaign = await db.campaign.create({
    data: {
      chainCampaignId: BigInt(1),
      sponsorWallet: "0x75C6cFdEDbEb6b34e4558AF2D0aFdBF19b273B09",
      objective: "Test Campaign - Agent Flow Demo",
      budgetWei: "1000000000000000000",
      premium: false,
      yellowEnabled: true,
      minProofsPerAgent: 1,
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });
  
  console.log("✅ Campaign created with ID:", campaign.id);
  console.log("   Objective:", campaign.objective);
  console.log("   Yellow Enabled:", campaign.yellowEnabled);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
