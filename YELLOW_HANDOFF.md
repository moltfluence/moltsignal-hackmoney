# 🟡 Yellow Network Integration - Handoff Guide

> **Branch:** `feat/yellow-integration`  
> **Target:** ETHGlobal HackMoney 2026 ($15k Yellow Prize + $10k Arc Prize)  
> **Status:** ✅ Backend Engine Complete | 🚧 Frontend Wiring Pending

---

## 📋 Quick Summary

| What | Status | Notes |
|------|--------|-------|
| YellowSessionAgent | ✅ Done | Full session lifecycle (open/pay/close) |
| Settlement Integration | ✅ Done | Integrated into `settleCampaign.ts` |
| Smoke Test | ✅ Passing | Verified connection to Yellow Sandbox |
| Frontend Wiring | 🚧 Needed | Trigger session open on campaign create |
| Arc Deployment | 🚧 Needed | Deploy contracts to Arc testnet |

---

## 🚀 Quick Start

### 1. Pull This Branch

```bash
git fetch origin
git checkout feat/yellow-integration
pnpm install
```

### 2. Verify Yellow Connection Works

```bash
pnpm tsx scripts/verify-yellow.ts
```

**Expected output:**
```
✅ WebSocket connection established
✅ ECDSA message signer created
✅ SUCCESS: Yellow Network Connection Verified!
```

### 3. Run Worker Build

```bash
pnpm --filter @molt/worker build
```

Should complete with no errors.

---

## 🏗️ What Was Built

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/worker/src/agents/YellowSessionAgent.ts` | 450+ | Core Yellow Network agent |
| `packages/worker/src/agents/index.ts` | 13 | Barrel export |
| `scripts/verify-yellow.ts` | 100+ | Connection smoke test |

### Modified Files

| File | Change |
|------|--------|
| `packages/worker/src/agents/types.ts` | Added `"close-yellow-sessions"` stage |
| `packages/worker/src/settleCampaign.ts` | Integrated Yellow closure in pipeline |

---

## 🔧 YellowSessionAgent API

```typescript
import { YellowSessionAgent, getYellowSessionAgent, isYellowEnabled } from "@molt/worker/agents";

// Check if Yellow is configured
if (isYellowEnabled()) {
  const agent = getYellowSessionAgent();

  // 1. Open a session when campaign starts
  const session = await agent.openSession(
    campaignId,      // DB campaign ID
    agentId,         // DB agent ID
    agentWallet,     // 0x... address
    "1000000000"     // Budget in atomic units (e.g., 1000 USDC @ 6 decimals)
  );

  // 2. Pay agent when they submit valid proof
  await agent.sendMicroReward(
    session.dbSessionId,
    agentWallet,
    "100000",              // Amount (0.1 USDC @ 6 decimals)
    "pay_per_valid_proof", // Reason for audit trail
    proofSubmissionId      // Optional: link to proof
  );

  // 3. Close session at campaign end (auto-called in settlement)
  await agent.closeSession(session.dbSessionId);
}
```

---

## 🔄 Settlement Flow (Updated)

```
ingest-proofs
    ↓
compute-scores
    ↓
sign-settlement
    ↓
submit-settlement (Arc on-chain tx)
    ↓
close-yellow-sessions  ← NEW! Closes all Yellow sessions
    ↓
sign-attestation
    ↓
submit-attestation (Arc on-chain tx)
    ↓
persist-results
```

The Yellow stage is **non-blocking** - if it fails, the main settlement continues.

---

## 📝 Environment Variables Needed

Add these to your `.env`:

```env
# Yellow Network (Sandbox/Testnet)
YELLOW_ENABLED="true"
YELLOW_CLEARNODE_WS_URL="wss://clearnet-sandbox.yellow.com/ws"
YELLOW_FAUCET_URL="https://clearnet-sandbox.yellow.com/faucet/requestTokens"
YELLOW_ASSET_SYMBOL="ytest.usd"
YELLOW_SENDER_PRIVATE_KEY="0x<YOUR_PRIVATE_KEY>"
YELLOW_PAY_PER_VALID_PROOF_ATOMIC="100000"  # 0.1 USDC @ 6 decimals
```

**Important:** The `YELLOW_SENDER_PRIVATE_KEY` wallet needs testnet tokens from the Yellow faucet.

---

## 🎯 What's Left For You

### Priority 1: Arc Deployment (Required for both prizes)

- [ ] Deploy `CampaignEscrow.sol` to Arc testnet
- [ ] Deploy `ReputationAttestor.sol` to Arc testnet
- [ ] Update `.env` with deployed addresses

### Priority 2: Frontend Yellow Wiring (Required for Yellow prize)

**On Campaign Create:**
```typescript
// In your campaign creation API/page
if (campaignData.yellowEnabled) {
  // The session opens automatically when first proof is submitted
  // via maybePayYellowForValidProof() in apps/web/src/lib/yellow.ts
}
```

**On Proof Submit:**
```typescript
// Already wired! See apps/web/src/lib/yellow.ts:159
// maybePayYellowForValidProof() is called automatically
```

### Priority 3: Explorer UI (Nice to have)

Show the `MicroReward` table on the campaign dashboard:

```sql
SELECT * FROM micro_rewards 
WHERE yellow_session_id IN (
  SELECT id FROM yellow_sessions WHERE campaign_id = ?
)
ORDER BY created_at DESC;
```

---

## 🎬 Demo Script for Judges

### Scene 1: The Setup (Arc)
- Sponsor creates campaign on **Arc Testnet**
- Show USDC leaving their wallet (one deposit tx)

### Scene 2: The Magic (Yellow)
**Split screen:**
- **Left:** Agent terminal showing "Task Verified"
- **Right:** MicroRewards table updating instantly

> *"Notice how the agent gets paid in milliseconds with zero gas fees using Yellow State Channels."*

### Scene 3: The Settlement (Arc)
- Campaign ends
- Show the **single settlement transaction** on Arc Explorer
- Show Yellow sessions marked as CLOSED in DB

> *"We settle the entire session in one transaction, saving 99% on gas."*

---

## 🧪 Testing Checklist

Before demo day:

- [ ] `pnpm tsx scripts/verify-yellow.ts` passes
- [ ] `pnpm --filter @molt/worker build` passes
- [ ] Create test campaign with `yellowEnabled: true`
- [ ] Submit proof and verify MicroReward created in DB
- [ ] Run `pnpm worker:settle <campaignId>` and verify sessions close
- [ ] Check `yellow_sessions.status` is `CLOSED` after settlement

---

## 🏆 Prize Requirements Checklist

### Yellow Network ($15k)
- [x] Multiple off-chain micro-reward transfers in session
- [x] One on-chain settlement tx when session closes
- [x] Explorer shows: session id, micro-reward ledger, settlement status
- [ ] **TODO:** Show actual Yellow settlement receipt in explorer

### Arc / Circle ($10k)
- [x] Campaign escrow in USDC on Arc testnet (contract exists)
- [x] Settlement pays agents in USDC (code ready)
- [ ] **TODO:** Deploy contracts to Arc testnet
- [ ] **TODO:** Test end-to-end USDC flow

---

## 📞 Quick Help

**"Yellow connection fails"**
→ Check `YELLOW_CLEARNODE_WS_URL` is correct
→ Run `pnpm tsx scripts/verify-yellow.ts` for diagnostics

**"Session won't open"**
→ Fund the `YELLOW_SENDER_PRIVATE_KEY` wallet from Yellow faucet
→ Check logs for specific SDK error

**"Settlement skips Yellow"**
→ Make sure `campaign.yellowEnabled = true` in DB
→ Make sure `YELLOW_ENABLED=true` in .env

---

## 🔗 References

- [Yellow Nitrolite SDK Docs](https://docs.yellow.com/nitrolite)
- [Yellow Sandbox Faucet](https://clearnet-sandbox.yellow.com/faucet)
- [Arc Testnet Explorer](https://explorer.testnet.arc.network)
- [MoltSignal PRD](./prd-ethglobal-hackmoney.md)

---

**Author:** AI Agent (via OpenCode)  
**Date:** Feb 7, 2026  
**Commit:** `feat/yellow-integration`
