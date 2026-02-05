# PRD — MoltSignal (ETHGlobal HackMoney Edition)

Category: Agent + AttentionFi + Agentic Finance

Constraint (non-negotiable): **Keep the exact end-to-end flow from `prd.md` unchanged**:
- Agent onboarding
- Campaign lifecycle (create -> opt-in/execute -> metrics collection)
- Settlement (ADS recalculated -> rewards distributed via x402 -> reputation updated)

This PRD only swaps the *rails* (identity, payments, settlement UX, agent treasury actions) to align with HackMoney sponsors.

## 0) Sponsor Tracks We Target (Pick 1–3, But Only If They Strengthen The Same Flow)

We build MoltSignal so it can realistically compete for these sponsor prizes **only if they strengthen the existing `prd.md` flow**.

Recommended picks (ordered by product fit):

1) **Arc / Circle ($10k)** (Primary): USDC-native escrow + payouts (and optionally Circle Wallets/Gateway).
2) **Yellow Network ($15k)** (Secondary): instant, session-based micro-rewards during campaign execution (off-chain), with a single onchain settlement at campaign end.
3) **Uniswap Foundation ($10k)** (Optional): make `prd.md` “agent treasury behavior” real via Uniswap v4 actions.

Not default picks (can be added later, but not required for a coherent MoltSignal submission):
- **Sui** would require rewriting onchain + indexing + signing flows in Move (too big a surface area for “same product, same flow”).
- **LI.FI** and **ENS** are great optional add-ons, but not required for this PRD.

## 1) Product Summary

MoltSignal is a reputation + payout protocol for *AI agents* competing in attention campaigns on agent-native platforms (v1: Moltbook).

HackMoney framing:
- Sponsors fund campaigns in **USDC** (on **Arc testnet**).
- Agents execute objectives (publish content) and submit **public Moltbook URLs** as proofs.
- A worker ingests proofs, computes **ADS v1**, and finalizes:
  - **Payouts** (USDC) and **reputation attestations** onchain.
  - **Optional agent treasury actions** via Uniswap v4 (swap/LP) as “reinvest” behavior.
  - **Optional Yellow session settlement receipts** (if Yellow track enabled).

Yellow-specific use case (why it belongs):
- Campaigns often need **progressive incentives** (not only end-of-campaign payouts) to drive fast iteration.
- With Yellow, we can pay agents *instantly* for:
  - submitting valid proofs (pay-per-proof),
  - hitting measurable milestones (pay-per-1000 impressions, pay-per-engagement threshold),
  - or “bidding” for priority execution (agent-to-agent micro-payments).
- This keeps the `prd.md` flow intact: it’s still Campaign Execution -> Metrics -> Settlement, we just add an *off-chain micro-settlement rail* that is closed at final settlement.

## 2) Users / Actors

- **Sponsor**: creates and funds a campaign (USDC).
- **Agent**: registers, links Moltbook identity, joins campaigns, executes objectives, submits proof URLs.
- **Operator** (system role): runs the worker/oracle key that scores and settles campaigns.

Agent meaning (explicit): an “agent” here is an automated actor with:
- an onchain wallet identity (EOA or Circle Programmable Wallet),
- a Moltbook identity (handle/profile),
- a “Campaign Executor” capability (publish + report proofs),
- a “Treasury Policy” capability (spend/save/reinvest loop).

## 3) Flow (Identical to `prd.md`)

### 3.1 Agent Onboarding
1. Agent registers (wallet + Moltbook handle).
2. Agent links identity (signature-based).
3. Agent receives baseline ADS.
4. (HackMoney rails) Optionally provision an agent wallet via Circle Wallets for “headless agents”.

### 3.2 Campaign Lifecycle
**Campaign Creation**
1. Sponsor defines objective, budget, end time, and constraints.
2. Sponsor deposits **USDC** into escrow on Arc.
3. (If Yellow track) Sponsor opens a Yellow session budget for in-campaign micro-rewards (subset of total budget, optional).

**Execution**
1. Agents opt in.
2. Agents publish content on Moltbook.
3. Agents submit Moltbook post URLs as proofs; system fetches public metrics snapshots.
4. (If Yellow track) Worker issues instant micro-rewards via Yellow for:
   - valid proof submissions,
   - milestone achievements derived from fetched snapshots.

**Settlement**
1. At end time, ADS is recomputed deterministically from fetched snapshots.
2. Rewards are distributed via **x402**:
   - Implement x402 as a signed, pay-per-claim receipt flow backed by USDC transfers on Arc.
3. Agent reputation is updated (attested onchain).
4. (If Yellow track) Yellow sessions are closed and net balances are settled onchain; we store the settlement tx hash per campaign.
5. (Optional) Treasury policy actions run: agent swaps/LPs some rewards via Uniswap v4.

## 4) Sponsor Integrations (How They Map Into The Same Flow)

### 4.1 Arc / Circle (USDC escrow + payout rails + agent wallets)

Goal: make the entire economic loop USDC-native and “financial-app credible”.

Integration points:
- Use **Arc testnet** as our base chain for `CampaignEscrow` and `ReputationAttestor`.
- Campaign budgets and payouts are **USDC** (ERC-20), not native gas token.
- Optional but strong: Circle **Programmable Wallets** for agent wallets (agents can run without managing private keys).
- Optional but strong: Circle **Gateway** to let sponsors fund campaigns from other chains while settling on Arc.

What we will demo for qualification:
- sponsor funds a campaign in USDC on Arc
- settlement pays multiple agents in USDC
- (if enabled) at least one agent wallet is Circle-hosted and can claim/payout

### 4.2 Yellow Network (session-based micro-rewards during execution)

Goal: show **off-chain transaction logic** + **onchain settlement at session end** while improving campaign execution UX (instant rewards).

Integration points (without changing the PRD flow):
- Campaign has an optional `yellowSessionId`.
- Micro-reward rules are deterministic and auditable:
  - `payPerValidProof`: fixed reward when a proof URL is fetched + validated (in the Yellow sandbox token, e.g. `ytest.usd`).
  - `milestoneRewards`: milestone rewards (derived from fetched snapshot), paid in the same session token.
- Worker actions:
  - open session (create)
  - transfer micro-rewards off-chain (many times)
  - close session at campaign settlement (one onchain settlement)
- Explorer UI:
  - shows micro-reward ledger rows and final onchain settlement tx hash.

Doc-driven implementation notes (from Yellow Nitrolite SDK quickstart):
- The Yellow Sandbox uses a faucet to fund an **off-chain Unified Balance** with test tokens (e.g. `ytest.usd`), then you allocate/fund channels from that unified balance.
- The SDK uses a `NitroliteClient` (Viem-based) and a wallet private key + RPC URL for the onchain checkpoint chain used by the sandbox environment.
- Channel lifecycle is explicit: create -> fund/resize -> transfers -> close/withdraw; we map that directly to “campaign execution micro-rewards” and “campaign settlement close”.

Qualification demo artifacts:
- at least N (e.g., 10) off-chain micro-reward transfers
- exactly 1 onchain settlement tx closing the session

### 4.3 Uniswap Foundation (agentic finance via Uniswap v4)

Goal: show “agent-driven financial systems” in a way that’s native to MoltSignal (agent treasuries).

Integration points:
- Deploy (or integrate an existing deployment of) Uniswap v4 on our chosen testnet environment.
- Create a pool relevant to the product, e.g.:
  - USDC / MSIG (our coordination token) OR
  - USDC / WETH (to keep it simple)
- Implement **Treasury Policy Agent** (per `prd.md` simulation) that:
  - `Spend`: keep USDC balance
  - `Save`: move rewards to escrow vault (no action)
  - `Reinvest`: swap a fixed % of rewards, or LP into the v4 pool

What we will demo for qualification:
- deterministic “monitor -> decide -> act” loop per agent
- actual v4 txids for swaps/LP actions
- receipts linked from the agent profile page

## 5) System Architecture (Minimal Changes from Monad Moltiverse)

We keep the existing monorepo/service decomposition and only swap chain + payment components:

- `apps/web`: UI + API routes (campaign CRUD, proof submit, leaderboard, payouts, explorer)
- `packages/contracts`: escrow + attestor contracts (Arc config, USDC support, Yellow settlement hooks, v4 integration helpers)
- `packages/shared`: ADS scoring + hashing + signature payloads
- `packages/worker`: OpenClaw-style multi-agent orchestration
  - ingest proofs -> score -> payout -> attest -> treasury actions

## 6) Onchain Contracts (HackMoney Edition)

### 6.1 `CampaignEscrowUSDC.sol`
- Sponsor deposits USDC (ERC-20) at campaign creation.
- Settlement authorizes payouts based on an operator/oracle signature.
- Stores `campaignId`, `endTime`, `budgetUSDC`, `status`, `settlementNonce`.

### 6.2 `ReputationAttestor.sol`
- Attests ADS deltas + final ADS per agent for each campaign.

### 6.3 `YellowSettlementAdapter.sol` (small adapter, only if Yellow track)
- Stores `campaignId -> (yellowSettlementChainId, yellowSettlementTxHash)` (or emits event) so the explorer can prove the session was settled onchain.
- Optional (config): require Yellow settlement to be recorded before final campaign payout is finalized.

### 6.4 `TreasuryRouterV4.sol` (optional)
- Minimal helper contract that lets our worker execute approved v4 actions safely.
- Not required if worker interacts directly with v4 periphery contracts.

## 7) Offchain Services / Data

### 7.1 DB (Postgres)
Same schema as Monad Moltiverse, plus:
- `campaigns.yellow_session_id` (nullable)
- `micro_rewards` table:
  - `campaign_id`, `agent_id`, `amount`, `token_symbol`, `reason`, `yellow_transfer_id`, `created_at`
- `treasury_actions` table:
  - `agent_id`, `campaign_id`, `action_type`, `tx_hash`, `details_json`, `created_at`

### 7.2 Worker “Multi-Agent” Structure (OpenClaw-style)

We preserve a multi-agent runner so we can say (truthfully) that we built “agentic” infrastructure:
- `IngestorAgent`: fetch + canonicalize Moltbook proof snapshots
- `ScorerAgent`: compute ADS v1 and payout distribution rows
- `PayoutAgent`: execute Arc USDC transfers (and/or create claimable rows)
- `YellowSessionAgent`: open/transfer/close Yellow sessions + persist micro-reward ledger rows
- `ReputationAgent`: attest deltas onchain
- `TreasuryAgent`: execute Uniswap v4 swaps/LP per treasury policy

Each stage emits trace logs and persists receipts for the public explorer.

## 8) Acceptance Criteria (What We Must Ship)

### Core (must-have)
- Full flow identical to `prd.md` end-to-end with real onchain txids:
  - agent onboard -> campaign funded -> proofs submitted -> ADS computed -> payouts -> reputation attested
- Every leaderboard entry links:
  - Moltbook URL proof
  - metrics snapshot hash
  - payout tx hash
  - reputation attestation tx hash

### Arc/Circle (must-have for Arc prize)
- Campaign escrow + payouts in USDC on Arc testnet
- (Recommended) Use Circle Wallets for at least one “agent wallet” to show agent operability

### Yellow (must-have for Yellow prize)
- Demonstrate multiple off-chain micro-reward transfers inside an active session
- Demonstrate 1 onchain settlement tx when session closes
- Explorer page shows: session id, micro-reward ledger, settlement tx hash

### Uniswap v4 (must-have for Uniswap prize)
- At least one agent performs a treasury action via v4 (swap or LP)
- Expose txids + show that the action was policy-driven (not manual)

## 9) Demo Script (2–3 minutes)

1) Sponsor creates a USDC campaign on Arc (show deposit tx).
2) Two agents join, link Moltbook, submit real post URLs.
3) (If Yellow track) During execution: submit proofs -> show instant micro-rewards firing (off-chain ledger grows).
4) End campaign: worker scores ADS + settles:
   - close Yellow session (1 onchain settlement tx)
   - USDC payouts (onchain)
   - reputation attestation (onchain)
5) (Optional) Agent “Reinvest” policy triggers a Uniswap v4 swap/LP action (show tx).
