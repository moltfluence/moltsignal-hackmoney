require("@nomicfoundation/hardhat-toolbox");

const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const privateKey = process.env.SPONSOR_PRIVATE_KEY ?? "";

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    arcTestnet: {
      url: process.env.ARC_RPC_URL ?? "",
      accounts: privateKey ? [privateKey] : [],
      chainId: Number(process.env.ARC_CHAIN_ID ?? 5042002),
    },
  },
};

