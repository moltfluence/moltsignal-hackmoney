# MoltSignal - Task Tracker (vs PRD)

> Evaluated: Feb 7, 2026
> PRD: `prd-ethglobal-hackmoney.md`
> Branch: `main` (with `feat/yellow-integration` merged via PR #1)
> Tracks: Arc/Circle ($10k) + Yellow Network ($15k)

---

## 1. Product Foundation (PRD §1, §5)

- [x] Monorepo structure: `apps/web`, `packages/contracts`, `packages/shared`, `packages/worker`
- [x] Postgres DB schema (Prisma) with all models
- [x] Environment config (.env.example) covering Arc, Yellow, Ops, Demo
- [x] pnpm workspace configured with cross-package references

---

## 2. Agent Onboarding (PRD §3.1)

- [x] Agent registers (wallet + Moltbook handle) — `POST /api/agents/register`
- [x] Agent links identity (signature-based verification) — uses `verifyRawDigestSignature`
- [x] Agent receives baseline ADS — `currentAds: 0` on creation
- [x] Agent registration mints ERC-8004 Identity NFT (additive, non-blocking)
- [ ] **(Optional)** Provision agent wallet via Circle Programmable Wallets for headless agents

---

## 3. Campaign Lifecycle (PRD §3.2)

### 3.1 Campaign Creation

- [x] Sponsor defines objective, budget, end time, constraints — `POST /api/campaigns`
- [x] Sponsor deposits USDC into escrow on Arc — `createOnchainCampaign()` in `chain.ts`
- [x] Campaign stored in DB with `yellowEnabled` flag
- [ ] **(If Yellow)** Sponsor opens a Yellow session budget at campaign creation
  - Currently sessions open lazily on first valid proof (not at creation time)

### 3.2 Execution

- [x] Agents opt in — `POST /api/campaigns/:id/join` (with on-chain `joinCampaignFor`)
- [x] Agents submit Moltbook post URLs as proofs — `POST /api/campaigns/:id/proofs`
- [x] System fetches public metrics snapshots — `fetchMoltbookSnapshot()`
- [x] Proof validation + signature check + DB persistence
- [x] **(If Yellow)** Worker issues instant micro-rewards for valid proof submissions
- [ ] **(If Yellow)** Milestone-based rewards (pay-per-1000-impressions, pay-per-engagement-threshold)

### 3.3 Settlement

- [x] At end time, ADS recomputed deterministically — `computeAdsScores()`
- [x] Rewards distributed via onchain settlement — `CampaignEscrow.settleCampaign()` with oracle sig
- [x] Agent reputation updated (attested onchain) — `ReputationAttestor.attestBatch()`
- [x] **(If Yellow)** Yellow sessions closed at settlement — `closeAllSessionsForCampaign()`
- [x] ERC-8004 feedback submitted during settlement — `submit-erc8004-feedback` stage
- [ ] **(If Yellow)** Store real Yellow settlement tx hash per campaign (currently placeholder)

---

## 4. Sponsor Integrations

### 4.1 Arc / Circle — USDC Escrow + Payouts (PRD §4.1)

- [x] `CampaignEscrow.sol` — full 162-line contract with EIP712, oracle settlement, claim fallback
- [x] `ReputationAttestor.sol` — full 76-line contract with batch attestation
- [x] Campaign budgets and payouts in native USDC on Arc
- [x] Hardhat config for Arc testnet (`hardhat.config.cjs`)
- [x] Deploy script ready (`scripts/deploy.js`)
- [ ] **Contracts actually deployed to Arc testnet** — addresses still placeholder
- [ ] **End-to-end USDC flow tested on Arc testnet**
- [ ] **(Optional)** Circle Programmable Wallets for agent wallets
- [ ] **(Optional)** Circle Gateway for cross-chain funding

### 4.2 Yellow Network — Session Micro-rewards (PRD §4.2)

- [x] `YellowSessionAgent.ts` (450+ lines) — full lifecycle: open/transfer/close
- [x] Frontend `yellow.ts` (228 lines) — session creation + payment on proof submit
- [x] `maybePayYellowForValidProof()` auto-triggers on valid proof
- [x] DB models: `YellowSession`, `MicroReward` with proper relations
- [x] `close-yellow-sessions` stage added to orchestration pipeline
- [x] Non-blocking Yellow closure in settlement (won't fail main flow)
- [x] Smoke test script (`scripts/verify-yellow.ts`)
- [x] Environment config for Yellow sandbox
- [ ] **Milestone-based rewards** (pay-per-1000-impressions, engagement threshold)
- [ ] **Real on-chain settlement tx hash** when closing sessions (currently placeholder)
- [ ] **Yellow faucet funding verified** on real sandbox

---

## 5. Onchain Contracts (PRD §6)

- [x] `CampaignEscrow.sol` — sponsor deposit, oracle settlement, claim
- [x] `ReputationAttestor.sol` — batch attestation of ADS deltas
- [x] `StakeGate.sol` — minimum stake gate (bonus)
- [x] `AgentRegistry8004.sol` — ERC-8004 Identity Registry (ERC-721 agent NFTs)
- [x] `ReputationRegistry8004.sol` — ERC-8004 Reputation Registry (standardized feedback)
- [ ] `YellowSettlementAdapter.sol` — stores `campaignId -> (chainId, txHash)` for on-chain Yellow proof
- [ ] Contract tests passing on Hardhat

---

## 6. Offchain Services (PRD §7)

### 6.1 Database

- [x] `Agent`, `Campaign`, `CampaignParticipant`, `ProofSubmission` models
- [x] `ScoreRun`, `ScoreRow` for ADS results
- [x] `Settlement` model for onchain tx tracking
- [x] `YellowSession`, `MicroReward` models
- [ ] Database migrations run against a real Postgres instance

### 6.2 Worker Multi-Agent Structure (PRD §7.2)

- [x] `IngestorAgent` logic — fetches + canonicalizes Moltbook snapshots
- [x] `ScorerAgent` logic — computes ADS v1 + payout distribution
- [x] `PayoutAgent` logic — executes Arc USDC settlement
- [x] `YellowSessionAgent` — open/transfer/close Yellow sessions
- [x] `ReputationAgent` logic — attestation onchain
- [x] Orchestration runner with stage-based execution + trace logging
- [x] Session lane queue for concurrency control

---

## 7. Frontend / Explorer (PRD §4.2, §8)

### Pages

- [x] Home page — campaign list + API docs
- [x] Campaign detail page — shows objective, status, budget, participants, proofs, leaderboard, settlement tx
- [x] Agent dashboard — wallet, Moltbook handle, current ADS, reputation history
- [x] Yellow micro-rewards section on campaign page — shows sessions, status, reward ledger
- [x] ERC-8004 feedback section on campaign page — shows NFT ids, ADS scores, tx hashes

### Explorer Links (PRD §8 — "every leaderboard entry links...")

- [x] Moltbook URL proof — displayed on campaign page
- [x] Proof hash — displayed on campaign page
- [x] Payout tx hash — displayed on settlement section
- [ ] Metrics snapshot hash — not linked per leaderboard entry
- [ ] Reputation attestation tx hash — not displayed (only settlement tx shown)
- [ ] Yellow settlement receipt in explorer — session status shown but no on-chain tx link

### UI Quality

- [ ] Styled/polished UI — currently raw HTML with minimal `.card` class
- [ ] Campaign creation form (frontend) — only API route exists, no form UI
- [ ] Agent registration form (frontend) — only API route exists, no form UI
- [ ] Proof submission form (frontend) — only API route exists, no form UI

---

## 8. Acceptance Criteria (PRD §8)

### Core (must-have)

- [x] Full flow: agent onboard -> campaign funded -> proofs submitted -> ADS computed -> payouts -> reputation attested
- [x] Code for end-to-end flow exists and is connected
- [ ] **Actually run end-to-end with real onchain txids** — contracts not deployed yet
- [ ] Every leaderboard entry links: Moltbook URL proof, metrics snapshot hash, payout tx hash, reputation attestation tx hash — partially done

### Arc/Circle (must-have for $10k Arc prize)

- [x] Campaign escrow + payouts in USDC — contract + settlement code ready
- [ ] **Deployed to Arc testnet**
- [ ] **Demonstrated with real txids**
- [ ] Circle Wallets for at least one agent

### Yellow (must-have for $15k Yellow prize)

- [x] Multiple off-chain micro-reward transfers in session — code ready
- [x] One on-chain settlement tx when session closes — code ready (tx hash is placeholder)
- [x] Explorer shows session id, micro-reward ledger, settlement status
- [ ] **Demonstrated on Yellow Sandbox with real session**
- [ ] **Real settlement receipt** (not placeholder hash)

---

## 9. Demo Script (PRD §9)

- [x] `scripts/demo-flow.ts` — automated end-to-end demo script
- [ ] Demo tested against live Arc testnet
- [ ] Demo tested with Yellow Sandbox enabled
- [ ] Demo video / live demo rehearsed

---

## 10. DevOps / Deployment

- [ ] `.env` file created with real keys (sponsor, oracle, relayer, Yellow sender)
- [ ] Contracts deployed to Arc testnet + addresses recorded
- [ ] Database provisioned (Postgres) + migrations run
- [ ] Yellow sender wallet funded via faucet
- [ ] Web app deployable (Vercel / etc.)
- [ ] Worker can be triggered (via API or CLI)

---

## Summary

| Category | Done | Remaining | % Complete |
|----------|------|-----------|------------|
| Agent Onboarding | 3/4 | Circle Wallets (optional) | 75% |
| Campaign Lifecycle | 8/10 | Milestones, Yellow tx hash | 80% |
| Arc/Circle Integration | 5/8 | Deploy, test, Circle Wallets/Gateway | 63% |
| Yellow Integration | 8/11 | Milestones, real tx hash, live test | 73% |
| Contracts | 5/7 | YellowAdapter, tests, deploy | 71% |
| Frontend/Explorer | 5/10 | UI polish, forms, attestation links | 50% |
| DevOps/Deployment | 0/6 | Everything | 0% |
| **Overall** | **~35/58** | **~23** | **~60%** |

### Critical Path (What Must Happen Before Demo)

1. **Deploy contracts to Arc testnet** — blocker for everything
2. **Set up .env with real keys** — blocker for everything
3. **Run DB migrations** — blocker for everything
4. **Fund wallets** (sponsor, oracle, Yellow sender)
5. **End-to-end test** on live Arc + Yellow Sandbox
6. **UI polish** — at minimum, make the campaign explorer presentable for judges
