import { ethers } from "hardhat";

async function main() {
  const stakeGateAddress = process.env.STAKE_GATE_ADDRESS;
  const tokenAddress = process.env.MSIG_TOKEN_ADDRESS;
  const minStakeWei = process.env.MIN_STAKE_WEI ?? "0";

  if (!stakeGateAddress || !tokenAddress) {
    throw new Error("Set STAKE_GATE_ADDRESS and MSIG_TOKEN_ADDRESS");
  }

  const stakeGate = await ethers.getContractAt("StakeGate", stakeGateAddress);
  const tx = await stakeGate.setStakeRules(tokenAddress, BigInt(minStakeWei));
  const receipt = await tx.wait();

  console.log("configured", { txHash: receipt?.hash, stakeGateAddress, tokenAddress, minStakeWei });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
