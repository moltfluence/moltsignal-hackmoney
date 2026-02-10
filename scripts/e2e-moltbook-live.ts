/**
 * MoltSignal E2E Live Test — Real Moltbook Agent
 * 
 * Flow:
 *   1. Agent creates a NEW post on Moltbook about the campaign
 *   2. Agent registers on MoltSignal with real wallet
 *   3. Operator creates a campaign (2 USDC, 1 milestone)
 *   4. Agent joins the campaign
 *   5. Agent submits proof with real Moltbook post URL
 *   6. MoltSignal verifies author + keywords + pays Yellow micropayment
 */

import { privateKeyToAccount } from "viem/accounts";
import { encodePacked, keccak256, stringToHex } from "viem";

// ──────────────── CONFIG ────────────────
const BASE = process.env.APP_BASE_URL || "http://localhost:3000";
const OPERATOR_KEY = process.env.OPERATOR_API_KEY || "moltsignal-hackathon-2026";
const CHAIN_ID = Number(process.env.CHAIN_ID || "5042002");
const ESCROW = (process.env.ESCROW_ADDRESS || "0xA214714b1e56adAa85D8359F300Bc1f3C09283e0") as `0x${string}`;

// Agent credentials (real Moltbook agent)
const AGENT_KEY = "0xb53a5ac5f9f59613d4e598fd6f9fb0d2059cc2af508edb0dceb3baa9a6635feb" as `0x${string}`;
const AGENT_HANDLE = "TestAgent_1770602380716";
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || "moltbook_sk_raViMsoguWwJPf7JMEe5WtbX6efc6EOg";

// Known existing posts (fallback if new post creation fails)
const EXISTING_POSTS = [
  "dfb6e0eb-053b-49b0-b396-2e86e98502e5",  // Campaign proof post (agent + economy keywords)
  "c1bf29e1-c375-4308-91d6-52f482968907",   // Original agent economy post
];
const EXISTING_POST_URL = `https://www.moltbook.com/post/${EXISTING_POSTS[0]}`;

// ──────────────── HELPERS ────────────────
const agent = privateKeyToAccount(AGENT_KEY);
const AGENT_WALLET = agent.address.toLowerCase() as `0x${string}`;

function packedDigest(types: readonly string[], values: readonly unknown[]): `0x${string}` {
  return keccak256(encodePacked(types as never, values as never));
}

function registerDigest(chainId: number, wallet: `0x${string}`, handle: string) {
  return packedDigest(
    ["bytes32", "uint256", "address", "bytes32"],
    [keccak256(stringToHex("REGISTER_AGENT")), BigInt(chainId), wallet, keccak256(stringToHex(handle))]
  );
}

function joinDigest(chainId: number, escrow: `0x${string}`, campaignId: bigint, wallet: `0x${string}`) {
  return packedDigest(
    ["bytes32", "uint256", "address", "uint256", "address"],
    [keccak256(stringToHex("JOIN_CAMPAIGN")), BigInt(chainId), escrow, campaignId, wallet]
  );
}

function proofDigest(chainId: number, campaignId: bigint, wallet: `0x${string}`, postUrl: string) {
  return packedDigest(
    ["bytes32", "uint256", "uint256", "address", "bytes32"],
    [keccak256(stringToHex("SUBMIT_PROOF")), BigInt(chainId), campaignId, wallet, keccak256(stringToHex(postUrl))]
  );
}

async function api(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = { "content-type": "application/json", ...(extraHeaders || {}) };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json };
}

function log(label: string, data: unknown) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("=".repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

// ──────────────── STEP 0: Try to create a NEW post on Moltbook ────────────────
async function tryCreateMoltbookPost(): Promise<string | null> {
  console.log("\n[STEP 0] Attempting to create a NEW post on Moltbook...");
  try {
    const res = await fetch("https://www.moltbook.com/api/v1/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${MOLTBOOK_API_KEY}`,
        "content-type": "application/json",
        "user-agent": "MoltSignal/0.1",
      },
      body: JSON.stringify({
        title: "MoltSignal Campaign Proof",
        content: "Completing a MoltSignal campaign quest! The agent economy is here — autonomous agents earning rewards for real work on the blockchain. #MoltSignal #Agent #Economy #Future",
        submolt: "general",
      }),
    });
    const json: any = await res.json().catch(() => null);
    console.log(`  Moltbook POST /posts => ${res.status}`, JSON.stringify(json).slice(0, 300));

    if (res.ok && json?.post?.id) {
      const newPostUrl = `https://www.moltbook.com/post/${json.post.id}`;
      console.log(`  NEW POST CREATED: ${newPostUrl}`);
      return newPostUrl;
    }
    if (res.status === 429 || (json?.error && /rate|limit|too many/i.test(String(json.error)))) {
      console.log("  Rate limited — will use existing post instead");
      return null;
    }
    console.log("  Post creation failed — using existing post");
    return null;
  } catch (err) {
    console.log("  Post creation error:", (err as Error).message);
    return null;
  }
}

// ──────────────── STEP 1: Register Agent ────────────────
async function registerAgent() {
  console.log("\n[STEP 1] Registering agent on MoltSignal...");
  console.log(`  Wallet: ${AGENT_WALLET}`);
  console.log(`  Handle: ${AGENT_HANDLE}`);

  const digest = registerDigest(CHAIN_ID, AGENT_WALLET, AGENT_HANDLE);
  const signature = await agent.signMessage({ message: { raw: digest } });

  const result = await api("POST", "/api/agents/register", {
    wallet: AGENT_WALLET,
    moltbookHandle: AGENT_HANDLE,
    signature,
  });
  log("Register Agent", result);
  if (!result.ok) throw new Error(`Registration failed: ${JSON.stringify(result.json)}`);
  return result.json;
}

// ──────────────── STEP 2: Create Campaign ────────────────
async function createCampaign() {
  console.log("\n[STEP 2] Creating campaign (2 USDC, 1 milestone)...");

  const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const result = await api(
    "POST",
    "/api/campaigns",
    {
      objective: "Share about the MoltSignal Agent Economy and the future of autonomous work",
      budgetUsdc: "2",
      endTime,
      premium: false,
      yellowEnabled: true,
      minProofsPerAgent: 1,
      milestones: [
        {
          task: "Post about MoltSignal agent economy on Moltbook",
          rewardUsdc: "1",
          maxAgents: 5,
          orderIndex: 0,
          keywords: ["agent", "economy"],
        },
      ],
    },
    { "x-operator-key": OPERATOR_KEY }
  );
  log("Create Campaign", result);
  if (!result.ok) throw new Error(`Campaign creation failed: ${JSON.stringify(result.json)}`);
  return result.json;
}

// ──────────────── STEP 3: Join Campaign ────────────────
async function joinCampaign(campaignId: number, chainCampaignId: string) {
  console.log(`\n[STEP 3] Agent joining campaign ${campaignId}...`);

  const digest = joinDigest(CHAIN_ID, ESCROW, BigInt(chainCampaignId), AGENT_WALLET);
  const signature = await agent.signMessage({ message: { raw: digest } });

  const result = await api("POST", `/api/campaigns/${campaignId}/join`, {
    wallet: AGENT_WALLET,
    signature,
  });
  log("Join Campaign", result);
  if (!result.ok) throw new Error(`Join failed: ${JSON.stringify(result.json)}`);
  return result.json;
}

// ──────────────── STEP 4: Submit Proof ────────────────
async function submitProof(campaignId: number, chainCampaignId: string, postUrl: string, milestoneId: number) {
  console.log(`\n[STEP 4] Submitting proof for campaign ${campaignId}...`);
  console.log(`  Post URL: ${postUrl}`);
  console.log(`  Milestone ID: ${milestoneId}`);

  const digest = proofDigest(CHAIN_ID, BigInt(chainCampaignId), AGENT_WALLET, postUrl);
  const signature = await agent.signMessage({ message: { raw: digest } });

  const result = await api("POST", `/api/campaigns/${campaignId}/proofs`, {
    wallet: AGENT_WALLET,
    postUrl,
    milestoneId,
    signature,
  });
  log("Submit Proof", result);
  return result;
}

// ──────────────── STEP 5: Check Leaderboard ────────────────
async function checkLeaderboard(campaignId: number) {
  console.log(`\n[STEP 5] Checking leaderboard for campaign ${campaignId}...`);
  const result = await api("GET", `/api/campaigns/${campaignId}/leaderboard`);
  log("Leaderboard", result);
  return result;
}

// ──────────────── MAIN ────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MoltSignal E2E Live Test — Real Moltbook Agent         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Agent: ${AGENT_HANDLE}`);
  console.log(`  Wallet: ${AGENT_WALLET}`);
  console.log(`  Chain: ${CHAIN_ID}`);
  console.log(`  Base URL: ${BASE}`);

  // Step 0: Try creating a new Moltbook post
  let postUrl = await tryCreateMoltbookPost();
  const isNewPost = !!postUrl;
  if (!postUrl) {
    postUrl = EXISTING_POST_URL;
    console.log(`  Using existing post: ${postUrl}`);
  }

  // Step 1: Register agent
  const regResult = await registerAgent();

  // Step 2: Create campaign
  const campResult = await createCampaign();
  const campaignId = campResult.data.campaign.id;
  const chainCampaignId = campResult.data.campaign.chainCampaignId;
  const milestoneId = campResult.data.campaign.milestones[0].id;
  console.log(`\n  Campaign ID: ${campaignId}`);
  console.log(`  Chain Campaign ID: ${chainCampaignId}`);
  console.log(`  Milestone ID: ${milestoneId}`);

  // Step 3: Join campaign
  await joinCampaign(campaignId, chainCampaignId);

  // Step 4: Submit proof
  const proofResult = await submitProof(campaignId, chainCampaignId, postUrl, milestoneId);

  // Step 5: Check leaderboard
  await checkLeaderboard(campaignId);

  // ──────────────── SUMMARY ────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  FULL E2E RESULTS");
  console.log("=".repeat(60));
  console.log(`  Agent Handle:        ${AGENT_HANDLE}`);
  console.log(`  Agent Wallet:        ${AGENT_WALLET}`);
  console.log(`  Campaign ID:         ${campaignId}`);
  console.log(`  Chain Campaign ID:   ${chainCampaignId}`);
  console.log(`  Milestone ID:        ${milestoneId}`);
  console.log(`  Post URL:            ${postUrl}`);
  console.log(`  New Post Created:    ${isNewPost ? "YES" : "NO (used existing)"}`);
  console.log(`  Proof Valid:         ${proofResult.json?.data?.proof?.valid ?? "UNKNOWN"}`);
  console.log(`  Proof ID:            ${proofResult.json?.data?.proof?.id ?? "UNKNOWN"}`);
  console.log(`  Milestone Claimed:   ${proofResult.json?.data?.proof?.milestoneClaim ? "YES" : "NO"}`);
  
  if (proofResult.json?.data?.proof?.milestoneClaim) {
    console.log(`  Milestone Reward:    ${proofResult.json.data.proof.milestoneClaim.rewardUsdc} USDC`);
  }
  if (proofResult.json?.data?.proof?.verificationErrors?.length > 0) {
    console.log(`  Verification Errors: ${proofResult.json.data.proof.verificationErrors.join(", ")}`);
  }
  console.log("=".repeat(60));

  if (proofResult.json?.data?.proof?.valid) {
    console.log("\n  E2E TEST: PASSED");
  } else {
    console.log("\n  E2E TEST: PROOF NOT VALID");
    console.log("  Check verificationErrors above for details");
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
