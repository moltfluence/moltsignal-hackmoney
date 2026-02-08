require("@nomicfoundation/hardhat-toolbox");

// Your Key (Hardcoded for speed)
const PRIVATE_KEY = "0x8b12e246bd10804b1595988af44ea838c357d3eb15680b64e36c767f8030eb05";

// Try multiple RPCs - Infura has free tier
const SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"; // Public demo key

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      timeout: 120000, // 2 minute timeout
      httpHeaders: {},
    },
  },
  mocha: {
    timeout: 120000,
  },
};
