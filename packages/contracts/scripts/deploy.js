const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer", deployer.address);

  const oracle = process.env.ORACLE_PRIVATE_KEY
    ? new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY).address
    : deployer.address;

  const CampaignEscrow = await ethers.getContractFactory("CampaignEscrow");
  const escrow = await CampaignEscrow.deploy(deployer.address, oracle);
  await escrow.waitForDeployment();

  const ReputationAttestor = await ethers.getContractFactory("ReputationAttestor");
  const attestor = await ReputationAttestor.deploy(deployer.address, oracle);
  await attestor.waitForDeployment();

  console.log("escrow", await escrow.getAddress());
  console.log("attestor", await attestor.getAddress());

  // ERC-8004 contracts
  const AgentRegistry8004 = await ethers.getContractFactory("AgentRegistry8004");
  const agentRegistry = await AgentRegistry8004.deploy(deployer.address);
  await agentRegistry.waitForDeployment();

  const agentRegistryAddress = await agentRegistry.getAddress();

  const ReputationRegistry8004 = await ethers.getContractFactory("ReputationRegistry8004");
  const reputationRegistry = await ReputationRegistry8004.deploy(agentRegistryAddress, deployer.address);
  await reputationRegistry.waitForDeployment();

  console.log("agentRegistry8004", agentRegistryAddress);
  console.log("reputationRegistry8004", await reputationRegistry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

