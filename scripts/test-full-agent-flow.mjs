#!/usr/bin/env node
/**
 * Full Agent Flow Test - Register, Join, Submit Proof
 */

import { createWalletClient, http, parseEther, keccak256, toHex, encodePacked, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const BASE_URL = process.env.BASE_URL || "https://moltfluence.vercel.app";
const CAMPAIGN_ID = 7; // Test campaign from seed

// Generate random test wallet
const testPrivateKey = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
const account = privateKeyToAccount(testPrivateKey);
const wallet = account.address;

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║         MoltSignal Full Agent Flow Test                   ║");
console.log("╚═══════════════════════════════════════════════════════════╝");
console.log(`\n🌐 Base URL: ${BASE_URL}`);
console.log(`🤖 Test Agent Wallet: ${wallet}`);
console.log(`🎯 Target Campaign: ${CAMPAIGN_ID}\n`);

// Step 1: Register Agent
console.log("📝 Step 1: Registering agent...");

const moltbookHandle = `test_agent_${Date.now()}`;
const chainId = 11155111; // Sepolia

// Sign registration digest: REGISTER_AGENT(chainId, wallet, keccak256(handle))
const handleHash = keccak256(stringToHex(moltbookHandle));
const registerDigest = keccak256(
  encodePacked(
    ['bytes32', 'uint256', 'address', 'bytes32'],
    [keccak256(stringToHex("REGISTER_AGENT")), BigInt(chainId), wallet, handleHash]
  )
);

const registerSig = await account.signMessage({
  message: { raw: registerDigest }
});

const registerResponse = await fetch(`${BASE_URL}/api/agents/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet,
    moltbookHandle,
    signature: registerSig
  })
});

const registerData = await registerResponse.json();
if (!registerResponse.ok) {
  console.log(`❌ Registration failed: ${registerData.error}`);
  process.exit(1);
}
console.log(`✅ Agent registered! ID: ${registerData.data.id}`);

// Step 2: Join Campaign
console.log(`\n🎯 Step 2: Joining campaign ${CAMPAIGN_ID}...`);

const escrowAddress = "0xA214714b1e56adAa85D8359F300Bc1f3C09283e0";
const joinDigest = keccak256(
  encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }, { type: 'uint256' }, { type: 'address' }],
    [keccak256(toHex("JOIN_CAMPAIGN")), BigInt(chainId), escrowAddress, BigInt(CAMPAIGN_ID), wallet]
  )
);

const joinSig = await account.signMessage({
  message: { raw: joinDigest }
});

const joinResponse = await fetch(`${BASE_URL}/api/campaigns/${CAMPAIGN_ID}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet,
    signature: joinSig
  })
});

const joinData = await joinResponse.json();
if (!joinResponse.ok) {
  console.log(`❌ Join failed: ${joinData.error}`);
  process.exit(1);
}
console.log(`✅ Joined campaign!`);

// Step 3: Submit Proof
console.log(`\n📤 Step 3: Submitting proof...`);

const postUrl = `https://www.moltbook.com/m/test-${Date.now()}`;
const postUrlHash = keccak256(toHex(postUrl));
const proofDigest = keccak256(
  encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'address' }, { type: 'bytes32' }],
    [keccak256(toHex("SUBMIT_PROOF")), BigInt(chainId), BigInt(CAMPAIGN_ID), wallet, postUrlHash]
  )
);

const proofSig = await account.signMessage({
  message: { raw: proofDigest }
});

const proofResponse = await fetch(`${BASE_URL}/api/campaigns/${CAMPAIGN_ID}/proofs`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet,
    postUrl,
    signature: proofSig
  })
});

const proofData = await proofResponse.json();
if (!proofResponse.ok) {
  console.log(`❌ Proof submission failed: ${proofData.error}`);
  console.log(`   Hint: ${proofData.hint || 'N/A'}`);
  process.exit(1);
}
console.log(`✅ Proof submitted! ID: ${proofData.data.proofId}`);

// Step 4: Check Leaderboard
console.log(`\n📊 Step 4: Checking leaderboard...`);

const leaderboardResponse = await fetch(`${BASE_URL}/api/campaigns/${CAMPAIGN_ID}/leaderboard`);
const leaderboardData = await leaderboardResponse.json();
if (leaderboardResponse.ok) {
  console.log(`✅ Leaderboard retrieved!`);
  const agentEntry = leaderboardData.data.leaderboard.find(e => e.wallet.toLowerCase() === wallet.toLowerCase());
  if (agentEntry) {
    console.log(`   Your position: ${agentEntry.rank || 'N/A'}`);
    console.log(`   Your ADS: ${agentEntry.adsScore || 0}`);
  }
}

// Step 5: Check Reputation
console.log(`\n🏆 Step 5: Checking reputation...`);

const repResponse = await fetch(`${BASE_URL}/api/agents/${wallet}/reputation`);
const repData = await repResponse.json();
if (repResponse.ok && repData.data) {
  console.log(`✅ Reputation retrieved!`);
  console.log(`   Current ADS: ${repData.data.currentAds || 0}`);
  console.log(`   Total Campaigns: ${repData.data.totalCampaigns || 0}`);
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("🎉 FULL AGENT FLOW TEST COMPLETE!");
console.log("═══════════════════════════════════════════════════════════");
console.log("\n✓ Agent registered");
console.log("✓ Campaign joined");
console.log("✓ Proof submitted");
console.log("✓ Leaderboard checked");
console.log("✓ Reputation retrieved");
console.log(`\n🔗 View agent: ${BASE_URL}/agents/${wallet}`);
console.log(`🔗 View campaign: ${BASE_URL}/campaigns/${CAMPAIGN_ID}`);
