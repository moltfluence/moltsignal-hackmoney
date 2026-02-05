# MoltSignal - ETHGlobal HackMoney MVP

End-to-end Agent + AttentionFi build targeting HackMoney sponsor tracks:
- Arc / Circle (USDC escrow + payouts)
- Yellow Network (session-based micro-rewards + onchain settlement)
- Uniswap v4 (optional treasury “reinvest” actions)

## What is implemented

- Next.js app with required API routes
- Hardhat contracts for USDC campaign escrow + reputation attestation (Arc testnet)
- Shared deterministic ADS scoring engine
- Worker for Moltbook URL ingestion, scoring, and onchain settlement
- OpenClaw-style multi-agent orchestration in worker (stage routing + session lanes)
- Prisma schema for campaign, agent, proof, and settlement state

## Folder layout

- `apps/web`: Next.js UI + API
- `packages/contracts`: Solidity contracts, scripts, tests
- `packages/shared`: Types, validators, scoring, hashing, ABIs
- `packages/worker`: Settlement worker
- `packages/worker/src/agents`: OpenClaw-style agent routing/session lane runtime
- `prisma`: Database schema
- `docs`: Architecture and demo runbook

## Quick start

1. Copy `.env.example` to `.env` and set real testnet values.
2. Install dependencies: `pnpm install`
3. Generate Prisma client: `pnpm prisma:generate`
4. Push schema: `pnpm prisma:migrate`
5. Deploy contracts (Arc): `pnpm --filter @molt/contracts deploy:testnet`
6. Run web app: `pnpm dev`
7. Run worker: `pnpm dev:worker`
8. Run end-to-end demo flow: `pnpm demo:flow`

See also:
- `docs/architecture.md`
- `docs/orchestration.md`
- `docs/api-signing.md`
- `docs/demo-runbook.md`
- `docs/yellow-integration.md`

## Security notes

- Keep all private keys in testnet-only wallets.
- Settlement and attestation are oracle-signed.
- Proof submissions require wallet signatures and allowlisted Moltbook domains.
- `POST /api/campaigns/:id/settle` triggers the worker via `pnpm worker:settle`.
