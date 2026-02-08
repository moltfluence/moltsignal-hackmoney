#!/usr/bin/env node
/**
 * MoltSignal Agent Simulator
 * 
 * This script simulates an AI agent:
 * 1. Connecting to the platform
 * 2. Joining a campaign
 * 3. Submitting work (proof)
 * 4. Receiving Yellow micropayment
 * 
 * Usage:
 *   node scripts/test-agent-flow.js
 * 
 * Or with custom values:
 *   CAMPAIGN_ID=1 AGENT_WALLET=0x123... node scripts/test-agent-flow.js
 */

const BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// Generate a random wallet for testing
function generateTestWallet() {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

// Simulate agent submitting work
async function submitWork(campaignId, proofUrl, agentWallet) {
  console.log("\n📤 Submitting work proof...");
  console.log(`   Campaign: ${campaignId}`);
  console.log(`   Proof URL: ${proofUrl}`);
  console.log(`   Agent Wallet: ${agentWallet}`);

  const response = await fetch(`${BASE_URL}/api/work/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      campaignId,
      proofUrl,
      agentWalletAddress: agentWallet,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.log("\n❌ Work submission failed!");
    console.log(`   Error: ${data.error}`);
    return null;
  }

  console.log("\n✅ Work submitted successfully!");
  console.log(`   Proof ID: ${data.proofId}`);
  console.log(`   Proof Hash: ${data.proofHash}`);
  
  if (data.yellowPayment) {
    console.log("\n💰 Yellow Micropayment Sent!");
    console.log(`   Amount: ${data.yellowPayment.amount} ${data.yellowPayment.tokenSymbol}`);
    console.log(`   Transfer ID: ${data.yellowPayment.yellowTransferId}`);
  } else {
    console.log("\n⚠️  No Yellow payment (Yellow not enabled for this campaign)");
  }

  return data;
}

// Create a test campaign via API
async function createTestCampaign() {
  console.log("\n🎯 Creating test campaign...");
  
  const response = await fetch(`${BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-operator-key": process.env.OPERATOR_API_KEY || "moltsignal-hackathon-2026",
    },
    body: JSON.stringify({
      objective: "Test Campaign - Agent Flow Demo",
      budgetUsdc: 1, // 1 USDC
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
      yellowEnabled: true,
      premium: false,
      minProofsPerAgent: 1,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.log(`   ⚠️  Could not create campaign: ${data.error || "Unknown error"}`);
    console.log("   Using campaign ID 1 as fallback...");
    return 1;
  }

  console.log(`   ✅ Campaign created with ID: ${data.id}`);
  return data.id;
}

// Main test flow
async function runAgentSimulation() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║         MoltSignal Agent Flow Simulator                   ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log(`\n🌐 Target: ${BASE_URL}`);

  // Step 1: Get or create campaign
  let campaignId = process.env.CAMPAIGN_ID;
  if (!campaignId) {
    try {
      campaignId = await createTestCampaign();
    } catch (e) {
      console.log("   ⚠️  Campaign creation failed, using ID 1");
      campaignId = 1;
    }
  }

  // Step 2: Generate test agent wallet
  const agentWallet = process.env.AGENT_WALLET || generateTestWallet();
  console.log(`\n🤖 Agent Wallet: ${agentWallet}`);

  // Step 3: Submit work
  const proofUrl = process.env.PROOF_URL || "https://www.moltbook.com/post/test-" + Date.now();
  
  try {
    const result = await submitWork(campaignId, proofUrl, agentWallet);
    
    if (result) {
      console.log("\n═══════════════════════════════════════════════════════════");
      console.log("🎉 AGENT FLOW TEST COMPLETE!");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("\nSummary:");
      console.log(`  ✓ Agent registered/found: ${result.agentId}`);
      console.log(`  ✓ Proof submitted: ${result.proofId}`);
      console.log(`  ✓ Campaign: ${result.campaignId}`);
      if (result.yellowPayment) {
        console.log(`  ✓ Payment sent: ${result.yellowPayment.amount} ${result.yellowPayment.tokenSymbol}`);
      }
      console.log("\nNext steps:");
      console.log("  1. Check database for new agent/proof records");
      console.log("  2. Check Yellow session in yellow_sessions table");
      console.log("  3. Run settlement to close Yellow sessions");
    }
  } catch (error) {
    console.log("\n❌ Error during test:");
    console.log(`   ${error.message}`);
    console.log("\nTroubleshooting:");
    console.log("  1. Is the web server running? (pnpm dev)");
    console.log("  2. Is the database connected?");
    console.log("  3. Check the server logs for errors");
  }
}

// Run the simulation
runAgentSimulation().catch(console.error);
