const { ethers } = require("hardhat");

// Deploy only the remaining ERC-8004 contracts
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying remaining contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  console.log("\n1. Deploying AgentRegistry8004...");
  const AgentRegistry8004 = await ethers.getContractFactory("AgentRegistry8004");
  const agentRegistry = await AgentRegistry8004.deploy(deployer.address);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("   AgentRegistry8004:", agentRegistryAddress);

  console.log("\n2. Deploying ReputationRegistry8004...");
  const ReputationRegistry8004 = await ethers.getContractFactory("ReputationRegistry8004");
  const reputationRegistry = await ReputationRegistry8004.deploy(agentRegistryAddress, deployer.address);
  await reputationRegistry.waitForDeployment();
  console.log("   ReputationRegistry8004:", await reputationRegistry.getAddress());

  console.log("\n=== ALL CONTRACTS ===");
  console.log('CAMPAIGN_ESCROW_ADDRESS="0xA214714b1e56adAa85D8359F300Bc1f3C09283e0"');
  console.log('REPUTATION_ATTESTOR_ADDRESS="0x011e460E64bECFEC8149e1090a3Bda63FbC1Da0c"');
  console.log(`AGENT_REGISTRY_ADDRESS="${agentRegistryAddress}"`);
  console.log(`REPUTATION_REGISTRY_ADDRESS="${await reputationRegistry.getAddress()}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
