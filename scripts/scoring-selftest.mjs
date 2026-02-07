import assert from "node:assert/strict";
import { ADS_V1_WEIGHTS, computeAdsScores } from "@molt/shared";

function makeInput(partial) {
  return {
    wallet: partial.wallet,
    impressions: partial.impressions ?? 1000,
    likes: partial.likes ?? 10,
    comments: partial.comments ?? 2,
    reposts: partial.reposts ?? 1,
    interactingAgents: partial.interactingAgents ?? [],
    interactionActors: partial.interactionActors ?? [],
    validProofs: partial.validProofs ?? 1,
    invalidProofs: partial.invalidProofs ?? 0,
    expectedProofs: partial.expectedProofs ?? 1,
  };
}

const budgetWei = 1_000_000n;
const priorAdsByWallet = {};
const priorAdsByHandle = { alpha: 8000, beta: 2000 };

const a = makeInput({
  wallet: "0x00000000000000000000000000000000000000a1",
  interactionActors: [
    { handle: "alpha", reach: 0, verified: true, counts: { comments: 3, votes: 0, reposts: 0 } },
    { handle: "beta", reach: 0, verified: false, counts: { comments: 1, votes: 0, reposts: 0 } },
  ],
});

const b = makeInput({
  wallet: "0x00000000000000000000000000000000000000b2",
  interactionActors: [{ handle: "alpha", reach: 0, verified: true, counts: { comments: 4, votes: 0, reposts: 0 } }],
});

const scores = computeAdsScores([a, b], budgetWei, priorAdsByWallet, ADS_V1_WEIGHTS, {
  priorAdsByHandle,
});

const scoreA = scores.find((s) => s.wallet === a.wallet);
const scoreB = scores.find((s) => s.wallet === b.wallet);
assert.ok(scoreA, "missing score A");
assert.ok(scoreB, "missing score B");

assert.ok(scoreA.networkUniqueActors >= 2, "A should have breadth >= 2 unique actors");
assert.equal(scoreB.networkUniqueActors, 1, "B should have 1 unique actor");
assert.ok(scoreA.adsBasisPoints >= 0 && scoreA.adsBasisPoints <= 10000);
assert.ok(scoreB.adsBasisPoints >= 0 && scoreB.adsBasisPoints <= 10000);

console.log("ok");

