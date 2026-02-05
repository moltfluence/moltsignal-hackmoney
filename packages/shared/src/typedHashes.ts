import { concat, encodeAbiParameters, keccak256, stringToHex, type Hex } from "viem";

const SETTLEMENT_TYPEHASH = keccak256(
  stringToHex("Settlement(address agent,uint96 payoutWei,uint32 adsScore,bytes32 proofHash)"),
);
const ATTESTATION_TYPEHASH = keccak256(
  stringToHex("Attestation(address agent,int32 adsDelta,uint32 adsAfter,bytes32 metricsHash)"),
);

export function hashSettlementRows(
  rows: Array<{
    agent: `0x${string}`;
    payoutWei: bigint;
    adsScore: number;
    proofHash: `0x${string}`;
  }>,
): `0x${string}` {
  const rowHashes = rows.map((row) =>
    keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "address" },
          { type: "uint96" },
          { type: "uint32" },
          { type: "bytes32" },
        ],
        [SETTLEMENT_TYPEHASH, row.agent, row.payoutWei, row.adsScore, row.proofHash],
      ),
    ),
  );

  return keccak256(concat(rowHashes as Hex[]));
}

export function hashAttestationRows(
  rows: Array<{
    agent: `0x${string}`;
    adsDelta: number;
    adsAfter: number;
    metricsHash: `0x${string}`;
  }>,
): `0x${string}` {
  const rowHashes = rows.map((row) =>
    keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "address" },
          { type: "int32" },
          { type: "uint32" },
          { type: "bytes32" },
        ],
        [ATTESTATION_TYPEHASH, row.agent, row.adsDelta, row.adsAfter, row.metricsHash],
      ),
    ),
  );

  return keccak256(concat(rowHashes as Hex[]));
}
