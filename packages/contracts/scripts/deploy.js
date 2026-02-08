const { ethers } = require("hardhat");

// Sepolia USDC Address (Circle's official testnet USDC)
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(50));
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("=".repeat(50));

  // Use deployer as oracle for hackathon (in production, use separate key)
  const oracle = deployer.address;
  const usdc = SEPOLIA_USDC;

  console.log("\n1. Deploying CampaignEscrow...");
  console.log("   - Owner:", deployer.address);
  console.log("   - Oracle:", oracle);
  console.log("   - USDC:", usdc);
  
  const CampaignEscrow = await ethers.getContractFactory("CampaignEscrow");
  const escrow = await CampaignEscrow.deploy(deployer.address, oracle, usdc);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("   CampaignEscrow deployed to:", escrowAddress);

  console.log("\n2. Deploying ReputationAttestor...");
  const ReputationAttestor = await ethers.getContractFactory("ReputationAttestor");
  const attestor = await ReputationAttestor.deploy(deployer.address, oracle);
  await attestor.waitForDeployment();
  const attestorAddress = await attestor.getAddress();
  console.log("   ReputationAttestor deployed to:", attestorAddress);

  console.log("\n3. Deploying AgentRegistry8004...");
  const AgentRegistry8004 = await ethers.getContractFactory("AgentRegistry8004");
  const agentRegistry = await AgentRegistry8004.deploy(deployer.address);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("   AgentRegistry8004 deployed to:", agentRegistryAddress);

  console.log("\n4. Deploying ReputationRegistry8004...");
  const ReputationRegistry8004 = await ethers.getContractFactory("ReputationRegistry8004");
  const reputationRegistry = await ReputationRegistry8004.deploy(agentRegistryAddress, deployer.address);
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("   ReputationRegistry8004 deployed to:", reputationRegistryAddress);

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=".repeat(50));
  console.log("\nAdd these to your .env file:");
  console.log("----------------------------------------");
  console.log(`CAMPAIGN_ESCROW_ADDRESS="${escrowAddress}"`);
  console.log(`REPUTATION_ATTESTOR_ADDRESS="${attestorAddress}"`);
  console.log(`AGENT_REGISTRY_ADDRESS="${agentRegistryAddress}"`);
  console.log(`REPUTATION_REGISTRY_ADDRESS="${reputationRegistryAddress}"`);
  console.log(`SEPOLIA_USDC_ADDRESS="${usdc}"`);
  console.log("----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
