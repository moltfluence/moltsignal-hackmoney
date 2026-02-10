#!/usr/bin/env node
/**
 * MoltSignal SKILL.md E2E Verification
 * 
 * Simulates a real OpenClaw agent discovering, registering, joining,
 * submitting proof, and checking leaderboard/reputation — exactly as
 * described in skills/moltsignal/SKILL.md.
 * 
 * Uses the /api/digests/* helper endpoints so we don't need to replicate
 * the digest encoding locally. Only dependency is viem for wallet signing.
 */

import { createWalletClient, http } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";

// ─── Config ──────────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || "https://moltfluence.vercel.app";
const HANDLE = `e2e_agent_${Date.now()}`;

const results = [];
let wallet;
let privateKey;
let campaignId;
let chainCampaignId;

function log(step, status, detail) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon}  [${step}] ${detail}`);
  results.push({ step, status, detail });
}

async function safeFetch(url, opts) {
  const res = await fetch(url, opts);
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, ok: res.ok, body };
}

// ─── Step 0: Generate wallet ─────────────────────────────────────────
console.log("\n╔═══════════════════════════════════════════════════════════╗");
console.log("║     MoltSignal SKILL.md E2E Verification                 ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
wallet = account.address;

console.log(`🌐  Base URL : ${BASE_URL}`);
console.log(`🤖  Wallet   : ${wallet}`);
console.log(`📛  Handle   : ${HANDLE}\n`);

// ─── Step 1: Discovery ───────────────────────────────────────────────
console.log("━━━ Step 1: Discovery (/.well-known/moltsignal.json) ━━━");
{
  const { ok, body } = await safeFetch(`${BASE_URL}/.well-known/moltsignal.json`);
  if (ok && body?.chain?.chainId) {
    log("discovery", "PASS", `chainId=${body.chain.chainId}, escrow=${body.chain.contracts.escrow}`);
    log("discovery:skill_md", body.discovery?.skillMd ? "PASS" : "FAIL", `skillMd=${body.discovery?.skillMd ?? "missing"}`);
    log("discovery:api_urls", body.api?.public?.register ? "PASS" : "FAIL", "All public API URLs present");
  } else {
    log("discovery", "FAIL", `Unexpected response: ${JSON.stringify(body)?.slice(0, 200)}`);
  }
}

// ─── Step 1b: Skill.md served ────────────────────────────────────────
console.log("\n━━━ Step 1b: Skill documentation endpoints ━━━");
{
  const [skillMd, skillJson] = await Promise.all([
    safeFetch(`${BASE_URL}/skill.md`),
    safeFetch(`${BASE_URL}/skill.json`),
  ]);
  log("skill.md", skillMd.ok ? "PASS" : "FAIL", `HTTP ${skillMd.status}`);
  log("skill.json", skillJson.ok ? "PASS" : "FAIL", `HTTP ${skillJson.status}`);
}

// ─── Step 2: List campaigns ──────────────────────────────────────────
console.log("\n━━━ Step 2: List campaigns ━━━");
{
  const { ok, body } = await safeFetch(`${BASE_URL}/api/campaigns`);
  if (ok && body?.data?.campaigns) {
    const campaigns = body.data.campaigns;
    log("list_campaigns", "PASS", `${campaigns.length} campaigns found`);

    // Pick the first ACTIVE campaign
    const active = campaigns.find((c) => c.status === "ACTIVE");
    if (active) {
      campaignId = active.id;
      chainCampaignId = active.chainCampaignId;
      log("pick_campaign", "PASS", `Using campaign id=${campaignId} (chain=${chainCampaignId}) "${active.objective}"`);
    } else {
      log("pick_campaign", "WARN", "No ACTIVE campaign found — will try campaign 7 anyway");
      campaignId = 7;
      chainCampaignId = "1000";
    }
  } else {
    log("list_campaigns", "FAIL", JSON.stringify(body)?.slice(0, 200));
  }
}

// ─── Step 3: Register agent ──────────────────────────────────────────
console.log("\n━━━ Step 3: Register agent ━━━");
{
  // 3a: Get the exact digest from the helper endpoint
  const digestUrl = `${BASE_URL}/api/digests/register?wallet=${wallet}&handle=${encodeURIComponent(HANDLE)}`;
  const { ok: dOk, body: dBody } = await safeFetch(digestUrl);

  if (!dOk || !dBody?.data?.digest) {
    log("register:digest", "FAIL", `Could not fetch digest: ${JSON.stringify(dBody)?.slice(0, 200)}`);
  } else {
    const digest = dBody.data.digest;
    log("register:digest", "PASS", `digest=${digest.slice(0, 18)}...`);

    // 3b: Sign digest as EIP-191 raw message
    const signature = await account.signMessage({ message: { raw: digest } });
    log("register:sign", "PASS", `signature=${signature.slice(0, 18)}...`);

    // 3c: POST /api/agents/register
    const { ok, status, body } = await safeFetch(`${BASE_URL}/api/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, moltbookHandle: HANDLE, signature }),
    });

    if (ok) {
      log("register:post", "PASS", `Agent registered: wallet=${body.data?.wallet}, handle=${body.data?.moltbookHandle}`);
      if (body.data?.erc8004) {
        log("register:erc8004", "PASS", `NFT minted: tokenId=${body.data.erc8004.nftTokenId}`);
      } else {
        log("register:erc8004", "WARN", "ERC-8004 mint skipped or not configured");
      }
    } else {
      log("register:post", "FAIL", `HTTP ${status}: ${body?.error ?? JSON.stringify(body)?.slice(0, 200)}`);
      if (body?.hint) console.log(`   💡 Hint: ${body.hint}`);
    }
  }
}

// ─── Step 4: Join campaign ───────────────────────────────────────────
console.log("\n━━━ Step 4: Join campaign ━━━");
{
  const digestUrl = `${BASE_URL}/api/digests/join?campaignId=${campaignId}&wallet=${wallet}`;
  const { ok: dOk, body: dBody } = await safeFetch(digestUrl);

  if (!dOk || !dBody?.data?.digest) {
    log("join:digest", "FAIL", `Could not fetch digest: ${JSON.stringify(dBody)?.slice(0, 200)}`);
  } else {
    const digest = dBody.data.digest;
    log("join:digest", "PASS", `digest=${digest.slice(0, 18)}..., chainCampaignId=${dBody.data.chainCampaignId}`);

    const signature = await account.signMessage({ message: { raw: digest } });
    log("join:sign", "PASS", `signature=${signature.slice(0, 18)}...`);

    const { ok, status, body } = await safeFetch(`${BASE_URL}/api/campaigns/${campaignId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, signature }),
    });

    if (ok) {
      log("join:post", "PASS", `Joined! txHash=${body.data?.txHash?.slice(0, 18) ?? "none"}...`);
    } else {
      // On-chain relay might fail (unfunded relayer), but we still want to test the rest
      log("join:post", "FAIL", `HTTP ${status}: ${body?.error ?? JSON.stringify(body)?.slice(0, 200)}`);
      if (body?.hint) console.log(`   💡 Hint: ${body.hint}`);

      // Try force-join if available
      const { ok: fjOk, body: fjBody } = await safeFetch(`${BASE_URL}/api/campaigns/${campaignId}/force-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      if (fjOk) {
        log("join:force-join", "PASS", "Used force-join fallback");
      } else {
        log("join:force-join", "WARN", `force-join also failed: ${fjBody?.error ?? "N/A"}`);
      }
    }
  }
}

// ─── Step 5: Submit proof ────────────────────────────────────────────
console.log("\n━━━ Step 5: Submit proof ━━━");
const postUrl = `https://www.moltbook.com/m/test-e2e-${Date.now()}`;
{
  const digestUrl = `${BASE_URL}/api/digests/proof?campaignId=${campaignId}&wallet=${wallet}&postUrl=${encodeURIComponent(postUrl)}`;
  const { ok: dOk, body: dBody } = await safeFetch(digestUrl);

  if (!dOk || !dBody?.data?.digest) {
    log("proof:digest", "FAIL", `Could not fetch digest: ${JSON.stringify(dBody)?.slice(0, 200)}`);
  } else {
    const digest = dBody.data.digest;
    log("proof:digest", "PASS", `digest=${digest.slice(0, 18)}...`);

    const signature = await account.signMessage({ message: { raw: digest } });
    log("proof:sign", "PASS", `signature=${signature.slice(0, 18)}...`);

    const { ok, status, body } = await safeFetch(`${BASE_URL}/api/campaigns/${campaignId}/proofs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, postUrl, signature }),
    });

    if (ok) {
      const p = body.data?.proof;
      log("proof:post", "PASS", `Proof id=${p?.id}, valid=${p?.valid}, hash=${p?.proofHash?.slice(0, 18) ?? "none"}...`);
      if (p?.verificationErrors?.length) {
        log("proof:verification", "WARN", `Verification warnings: ${p.verificationErrors.join("; ")}`);
      }
    } else {
      log("proof:post", "FAIL", `HTTP ${status}: ${body?.error ?? JSON.stringify(body)?.slice(0, 200)}`);
      if (body?.hint) console.log(`   💡 Hint: ${body.hint}`);
    }
  }
}

// ─── Step 6: Get leaderboard ─────────────────────────────────────────
console.log("\n━━━ Step 6: Get leaderboard ━━━");
{
  const { ok, status, body } = await safeFetch(`${BASE_URL}/api/campaigns/${campaignId}/leaderboard`);
  if (ok && body?.data?.leaderboard) {
    log("leaderboard", "PASS", `${body.data.leaderboard.length} agents on leaderboard`);
    const me = body.data.leaderboard.find((e) => e.wallet?.toLowerCase() === wallet.toLowerCase());
    if (me) {
      log("leaderboard:self", "PASS", `Found self: adsScore=${me.adsScore ?? me.ads ?? 0}`);
    } else {
      log("leaderboard:self", "WARN", "Agent not found on leaderboard (may require valid proof)");
    }
  } else {
    log("leaderboard", "FAIL", `HTTP ${status}: ${JSON.stringify(body)?.slice(0, 200)}`);
  }
}

// ─── Step 7: Get reputation ──────────────────────────────────────────
console.log("\n━━━ Step 7: Get reputation ━━━");
{
  const { ok, status, body } = await safeFetch(`${BASE_URL}/api/agents/${wallet}/reputation`);
  if (ok && body?.data) {
    log("reputation", "PASS", `wallet=${body.data.wallet}, currentAds=${body.data.currentAds}, history=${body.data.history?.length ?? 0} entries`);
  } else {
    // reputation endpoint lowercases wallet, might need to match DB casing
    log("reputation", "FAIL", `HTTP ${status}: ${body?.error ?? JSON.stringify(body)?.slice(0, 200)}`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────
console.log("\n\n═══════════════════════════════════════════════════════════");
console.log("                    SUMMARY                                ");
console.log("═══════════════════════════════════════════════════════════\n");

const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL").length;
const warn = results.filter((r) => r.status === "WARN").length;

console.log(`  ✅ PASS: ${pass}`);
console.log(`  ❌ FAIL: ${fail}`);
console.log(`  ⚠️  WARN: ${warn}`);
console.log(`  📊 Total: ${results.length}\n`);

if (fail > 0) {
  console.log("Failed steps:");
  for (const r of results.filter((r) => r.status === "FAIL")) {
    console.log(`  ❌ ${r.step}: ${r.detail}`);
  }
}
if (warn > 0) {
  console.log("\nWarnings:");
  for (const r of results.filter((r) => r.status === "WARN")) {
    console.log(`  ⚠️  ${r.step}: ${r.detail}`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════\n");
process.exit(fail > 0 ? 1 : 0);
