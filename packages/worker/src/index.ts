import { settleCampaign } from "./settleCampaign.js";

async function main() {
  const campaignIdRaw = process.argv[2];
  if (!campaignIdRaw) {
    console.error("Usage: pnpm worker:settle <campaignId>");
    process.exit(1);
  }

  const campaignId = Number(campaignIdRaw);
  if (!Number.isFinite(campaignId)) {
    throw new Error("campaignId must be numeric");
  }

  const result = await settleCampaign(campaignId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
