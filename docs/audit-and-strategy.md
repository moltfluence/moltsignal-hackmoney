# MoltSignal — Full Audit & Dual-Hackathon Strategy

> Generated: Feb 7, 2026
> Hackathon 1: **ETHGlobal HackMoney 2026** (Arc $10k + Yellow $15k)
> Hackathon 2: **Circle OpenClaw USDC Hackathon on Moltbook** ($30k across 3 tracks)

---

## 1. Ecosystem Context (What Moltbook/Moltbot/OpenClaw Actually Are)

- **Moltbook** — A Reddit-like social network *exclusively for AI agents*. Agents post, comment, vote in topic-specific "submolts". Humans can only observe. 770k+ active agents. Created by Matt Schlicht.
- **OpenClaw** (formerly Moltbot) — Open-source AI agent software (created by Peter Steinberger). Agents running OpenClaw are called "Clawdbots" or "Moltbots". It supports multi-agent routing, skills, and session-based orchestration.
- **Relationship**: OpenClaw agents are the primary participants on Moltbook. The ecosystem is agent-first — agents build, transact, and vote.

**Our product fit**: MoltSignal is a *reputation + payout protocol* for AI agents competing in attention campaigns on Moltbook. This is a perfect fit — we provide the economic coordination layer (campaigns, escrow, scoring, payouts) that the Moltbook/OpenClaw ecosystem currently lacks.

---

## 2. Codebase Audit — What's Done vs What's Left

### ✅ COMPLETED (~60%)

| Area | Status |
|------|--------|
| Monorepo structure (apps/web, packages/contracts, packages/shared, packages/worker) | ✅ |
| Postgres schema (Prisma) — Agent, Campaign, Proof, Score, Settlement, YellowSession, MicroReward | ✅ |
| Agent registration API + signature verification + baseline ADS | ✅ |
| Campaign CRUD API (create, join, proofs, leaderboard, settle) | ✅ |
| CampaignEscrow.sol — EIP712, oracle settlement, claim fallback (162 lines) | ✅ |
| ReputationAttestor.sol — batch attestation (76 lines) | ✅ |
| AgentRegistry8004.sol — ERC-721 agent identity NFTs | ✅ |
| ReputationRegistry8004.sol — ERC-8004 feedback registry | ✅ |
| Worker multi-agent orchestration (Ingestor, Scorer, Payout, Yellow, Reputation agents) | ✅ |
| YellowSessionAgent.ts (450+ lines) — full open/transfer/close lifecycle | ✅ |
| Frontend: home, campaign detail, agent dashboard, Yellow micro-rewards section, ERC-8004 section | ✅ |
| Demo flow script (scripts/demo-flow.ts) | ✅ |
| Hardhat config for Arc testnet | ✅ |

### ❌ NOT DONE — Critical Gaps

| # | Gap | Blocker For | Priority |
|---|-----|-------------|----------|
| 1 | **CampaignEscrow.sol uses native ETH (`msg.value`), NOT ERC-20 USDC** | Arc prize — they require USDC (ERC-20). Must refactor to `IERC20.transferFrom()` | 🔴 CRITICAL |
| 2 | **Contracts not deployed to Arc testnet** | Everything — no real txids | 🔴 CRITICAL |
| 3 | **No .env with real keys** | Everything | 🔴 CRITICAL |
| 4 | **No DB migrations run** | Everything | 🔴 CRITICAL |
| 5 | **YellowSettlementAdapter.sol not written** | Yellow prize — need on-chain proof of session settlement | 🟡 HIGH |
| 6 | **Yellow settlement tx hash is placeholder** | Yellow prize qualification | 🟡 HIGH |
| 7 | **No milestone-based Yellow rewards** (pay-per-1000-impressions) | Yellow prize depth | 🟡 MEDIUM |
| 8 | **UI is raw HTML with minimal styling** — no forms for campaign creation, agent registration, proof submission | Arc prize requires "Functional MVP with frontend" | 🟡 HIGH |
| 9 | **No Circle Programmable Wallets integration** | Arc prize (recommended, not required) | 🟡 MEDIUM |
| 10 | **No Circle Gateway integration** | Arc prize (recommended) | 🟡 MEDIUM |
| 11 | **No architecture diagram** | Arc prize requires it explicitly | 🟡 HIGH |
| 12 | **No demo video** | Both hackathons | 🟡 HIGH |
| 13 | **Metrics snapshot hash not linked per leaderboard entry** | PRD §8 acceptance criteria | 🟡 MEDIUM |
| 14 | **Reputation attestation tx hash not displayed** | PRD §8 acceptance criteria | 🟡 MEDIUM |
| 15 | **Contract tests not written** | Code quality | 🟢 LOW |

---

## 3. ETHGlobal HackMoney 2026 — Prize Analysis

### 3.1 Arc / Circle Prize ($10,000)

**Required tools**: Arc, USDC
**Recommended tools**: Circle Wallets, Circle Gateway, Circle Contracts, Bridge Kit, Stork

**Qualification checklist**:
| Requirement | Our Status | Gap |
|-------------|-----------|-----|
| Functional MVP (working frontend + backend) | ⚠️ Backend done, frontend is raw HTML | Need styled UI with forms |
| Architecture diagram | ❌ Missing | Must create |
| Product feedback (clear, actionable) | ❌ Not written | Must write |
| Video demo (2-4 min) | ❌ Not recorded | Must record |
| GitHub repo link | ✅ | — |
| Uses Arc testnet | ⚠️ Config ready, not deployed | Must deploy |
| Uses USDC | ❌ **Contract uses native ETH, not ERC-20 USDC** | 🔴 Must refactor CampaignEscrow.sol |

**Key insight**: The `.env.example` says `ARC_USDC_ADDRESS="0x3600000000000000000000000000000000000000"` suggesting Arc's native gas token has an ERC-20 interface. But `CampaignEscrow.sol` uses `msg.value` / `payable` — it does NOT call any ERC-20 methods. **This must be fixed** to qualify for the Arc prize. The contract needs to accept USDC via `IERC20.transferFrom()` for deposits and `IERC20.transfer()` for payouts.

### 3.2 Yellow Network Prize ($15,000)

**Qualification checklist**:
| Requirement | Our Status | Gap |
|-------------|-----------|-----|
| Use Yellow SDK / Nitrolite protocol | ✅ YellowSessionAgent uses Nitrolite | — |
| Demonstrate off-chain transaction logic | ✅ Micro-rewards on proof submission | — |
| Settlement finalized via smart contracts | ⚠️ Code exists but tx hash is placeholder | Must get real tx |
| Working prototype | ⚠️ Code ready, not tested on sandbox | Must test |
| 2-3 min demo video | ❌ | Must record |
| Repo link | ✅ | — |

**Judging criteria**: Problem & Solution, Yellow SDK depth, Business Model, Presentation, Team Potential.

**Our gap**: We need to articulate a clear **business model** (e.g., MoltSignal takes a % fee on campaign settlements, Yellow micro-rewards reduce agent churn by 3x, etc.).

---

## 4. Circle OpenClaw USDC Hackathon on Moltbook — Eligibility

**Prize pool**: $30,000 USDC across 3 tracks
**Platform**: Moltbook (submissions go to `m/usdc` submolt)
**Participants**: Autonomous agents (agent-led voting!)
**Deadline**: Sunday, Feb 8 at 12:00 PM PST

### Track Eligibility

| Track | Prize | Our Fit | Eligible? |
|-------|-------|---------|-----------|
| **Agentic Commerce** | ~$10k | ✅ **STRONG** — MoltSignal is literally agents pricing, paying, incentivizing commerce using USDC. Campaign escrow + ADS-based payouts + micro-rewards = agentic commerce. | ✅ YES |
| **Best OpenClaw Skill** | ~$10k | ⚠️ MODERATE — Our worker uses "OpenClaw-style" multi-agent orchestration but we haven't packaged it as an installable OpenClaw skill via ClawhHub. | ⚠️ Needs work |
| **Most Novel Smart Contract** | ~$10k | ✅ **STRONG** — ERC-8004 Identity + Reputation registries, USDC escrow with oracle settlement, ADS-based payout distribution. Novel patterns in agent coordination. | ✅ YES |

### What We Need to Do for This Hackathon

1. **Package as an OpenClaw Skill** — Create a ClawhHub-installable skill that lets any OpenClaw agent join MoltSignal campaigns, submit proofs, and receive USDC payouts. This makes us eligible for "Best OpenClaw Skill" track too.
2. **Submit to `m/usdc` submolt on Moltbook** — The submission itself must be posted by an agent on Moltbook.
3. **Ensure USDC is the settlement layer** — Same fix needed as for Arc prize (ERC-20 USDC, not native ETH).
4. **Agent-led voting** — Our project will be evaluated by other agents, so the README/description must be clear and machine-parseable.

---

## 5. Unified Strategy — Making One Product Win Both Hackathons

The good news: **both hackathons want the same thing** — USDC-native agentic economic infrastructure on Moltbook. Here's how to align:

### Narrative

> **MoltSignal** is the reputation + payout protocol for the agent economy on Moltbook. Sponsors fund attention campaigns in USDC on Arc. OpenClaw agents compete by publishing content, earning micro-rewards via Yellow Network in real-time, and receiving final USDC payouts based on their Attention Distribution Score (ADS). Agent identities and reputations are portable via ERC-8004 NFTs.

### Shared Deliverables (One Build, Two Submissions)

| Deliverable | ETHGlobal Arc | ETHGlobal Yellow | Circle OpenClaw |
|-------------|---------------|------------------|-----------------|
| USDC escrow + payouts on Arc | ✅ Required | — | ✅ Required (Agentic Commerce) |
| Yellow micro-rewards | — | ✅ Required | ✅ Bonus (progressive incentives) |
| ERC-8004 agent identity + reputation | ✅ Bonus | — | ✅ Required (Novel Smart Contract) |
| OpenClaw skill packaging | — | — | ✅ Required (Best Skill) |
| Circle Wallets for agents | ✅ Recommended | — | ✅ Strong bonus |
| Architecture diagram | ✅ Required | — | ✅ Helpful |
| Demo video | ✅ Required | ✅ Required | ✅ Helpful |
| Moltbook submission post | — | — | ✅ Required |

---

## 6. Critical Path — Prioritized Action Items

### 🔴 P0 — Must Do (blocks everything)

1. **Refactor `CampaignEscrow.sol` to use ERC-20 USDC** instead of native ETH
   - Add `IERC20 public usdc` state variable
   - `createCampaign`: use `usdc.transferFrom(msg.sender, address(this), budget)`
   - `settleCampaign`: use `usdc.transfer(agent, payout)`
   - `claim`: use `usdc.transfer(msg.sender, amount)`
   - Remove all `payable` / `msg.value` logic

2. **Deploy all contracts to Arc testnet**
   - CampaignEscrow (with USDC address)
   - ReputationAttestor
   - AgentRegistry8004
   - ReputationRegistry8004
   - Record addresses in `.env`

3. **Set up `.env` with real keys**
   - Sponsor, Oracle, Relayer private keys (generate fresh for testnet)
   - Fund via Circle faucet (https://faucet.circle.com/)

4. **Run DB migrations** against a real Postgres instance

5. **End-to-end test** on live Arc testnet

### 🟡 P1 — High Priority (prize qualification)

6. **Write `YellowSettlementAdapter.sol`** — stores `campaignId -> (chainId, txHash)`
7. **Get real Yellow settlement tx hash** — test on Yellow Sandbox, replace placeholder
8. **Polish UI** — Add Tailwind/shadcn, create forms for campaign creation, agent registration, proof submission
9. **Create architecture diagram** (required by Arc prize)
10. **Write product feedback document** for Circle (required by Arc prize — "clear and actionable feedback will heavily influence judgement")
11. **Record 2-4 min demo video**

### 🟢 P2 — Bonus (increases win probability)

12. **Circle Programmable Wallets** — provision at least one agent wallet via Circle API
13. **Package as OpenClaw Skill** — create ClawhHub-installable skill for Circle OpenClaw hackathon
14. **Submit to Moltbook `m/usdc` submolt** via an agent
15. **Add milestone-based Yellow rewards** (pay-per-1000-impressions)
16. **Circle Gateway** — let sponsors fund from other chains
17. **Stork oracle integration** (mentioned in Arc recommended tools)

---

## 7. Suggestions to Make the Product Stronger

1. **USDC-native everything**: Since both hackathons center on USDC, make the entire economic loop USDC — escrow, micro-rewards, payouts, even agent staking. This is the single strongest signal for judges.

2. **Circle Wallets for "headless agents"**: This is a killer demo moment — show an agent with no private key management receiving USDC payouts via Circle's hosted wallet. It proves agents can be truly autonomous economic actors.

3. **OpenClaw Skill = distribution**: If you package MoltSignal as a ClawhHub skill, any of the 770k+ Moltbook agents can install it and start earning. This is a massive distribution story for judges.

4. **Business model slide**: Yellow prize explicitly judges on "Business Model". Add a slide: "MoltSignal takes 2% of campaign settlements. Sponsors pay for attention. Agents earn for performance. Yellow reduces settlement latency from days to seconds."

5. **ERC-8004 as portable reputation**: Emphasize that agent reputation is *interoperable* — any ERC-8004-compatible system can read an agent's MoltSignal reputation. This is novel and forward-looking.

6. **Real Moltbook integration**: Actually fetch real metrics from Moltbook posts (likes, comments, reposts). Even if mocked for demo, showing real URL parsing + metric extraction is impressive.

7. **Progressive disclosure in demo**: Start with the simple flow (sponsor → campaign → agent → payout), then reveal the layers (Yellow micro-rewards firing in real-time, ERC-8004 reputation updating, Circle Wallet receiving funds).

---

## 8. Contract Bug: CampaignEscrow Uses ETH, Not USDC

**File**: `packages/contracts/contracts/CampaignEscrow.sol`

The current contract uses `msg.value` (native ETH) for campaign budgets and `payable` calls for payouts. The Arc prize **requires USDC (ERC-20)**. This is the single most critical fix.

**What needs to change**:
- Constructor: accept `address usdc_` parameter
- `createCampaign`: replace `msg.value` with `IERC20(usdc).transferFrom()`
- `settleCampaign`: replace `.call{value:}` with `IERC20(usdc).transfer()`
- `claim`: same ERC-20 transfer
- Remove `payable` modifiers

---

## 9. Timeline Recommendation

Given the Circle OpenClaw deadline is **Feb 8 at 12:00 PM PST** (~tomorrow), and ETHGlobal HackMoney is async:

| When | What |
|------|------|
| **Now → Tonight** | Fix CampaignEscrow to ERC-20 USDC, deploy contracts, set up .env, run migrations |
| **Tonight** | End-to-end test on Arc testnet, test Yellow on sandbox |
| **Tomorrow AM** | Polish UI minimally, create architecture diagram, record demo video |
| **Tomorrow by noon PST** | Submit to Moltbook `m/usdc` for Circle OpenClaw hackathon |
| **Remaining days** | Circle Wallets integration, OpenClaw skill packaging, full UI polish, ETHGlobal submission |
