# OpenClaw-Style Orchestration

The settlement worker now follows an OpenClaw-inspired runtime shape:

- **Agent routing**: stage-to-agent assignment with binding overrides.
- **Session keys**: deterministic `agent:<id>:campaign:<id>:stage:<stage>`.
- **Serialized lanes**: per-session lane + global lane queueing.
- **Lifecycle traces**: each stage stores `agentId`, `sessionKey`, `matchedBy`, and timing.

## Agent roles

- `proof-scout`: ingest and refresh Moltbook proof snapshots.
- `score-engine`: compute ADS and payout rows.
- `oracle-signer`: produce EIP-712 signatures for settlement and attestation payloads.
- `settlement-executor`: submit `settleCampaign` tx.
- `reputation-attestor`: submit attestation tx and persist offchain state.

## Routing precedence

Binding resolution is deterministic and picks the most specific matching rule:

1. `wallet + campaignId + stage`
2. `wallet + campaignId`
3. `wallet + stage`
4. `campaignId + stage`
5. `wallet`
6. `campaignId`
7. `stage`
8. default stage agent
9. optional default agent override

## Config override

Set `ORCHESTRATION_BINDINGS_JSON` to override routing:

```json
[
  {
    "agentId": "proof-scout",
    "match": { "campaignId": 42, "stage": "ingest-proofs" }
  },
  {
    "agentId": "oracle-signer",
    "match": { "stage": "sign-settlement" }
  }
]
```

If no binding matches, stage defaults are used.
