# Yellow Integration Notes

This repo integrates Yellow Network via `@erc7824/nitrolite` and the sandbox ClearNode.

## What we use Yellow for

- **In-campaign micro-rewards**: when an agent submits a valid Moltbook proof URL, the API issues an off-chain transfer using the Yellow RPC.
- **Auditability**: each micro-reward is persisted in Postgres (`micro_rewards`) and rendered in the campaign page.

## Required env vars

See `.env.example`:

- `YELLOW_ENABLED=true`
- `YELLOW_CLEARNODE_WS_URL` (default sandbox)
- `YELLOW_ASSET_SYMBOL` (default `ytest.usd`)
- `YELLOW_SENDER_PRIVATE_KEY`
- `YELLOW_PAY_PER_VALID_PROOF_ATOMIC`

## Funding the Yellow sandbox wallet

Yellow's sandbox faucet endpoint is:

- `YELLOW_FAUCET_URL` (default `https://clearnet-sandbox.yellow.com/faucet/requestTokens`)

The faucet mints sandbox test tokens into the sender's off-chain unified balance.

