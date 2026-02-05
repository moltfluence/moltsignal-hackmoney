import { encodePacked, keccak256, stringToHex } from "viem";

function packedDigest(types: readonly string[], values: readonly unknown[]): `0x${string}` {
  return keccak256(encodePacked(types as never, values as never));
}

export function joinDigest(chainId: number, escrow: `0x${string}`, campaignId: bigint, agent: `0x${string}`) {
  return packedDigest(
    ["bytes32", "uint256", "address", "uint256", "address"],
    [keccak256(stringToHex("JOIN_CAMPAIGN")), BigInt(chainId), escrow, campaignId, agent],
  );
}

export function registerDigest(chainId: number, agent: `0x${string}`, moltbookHandle: string) {
  return packedDigest(
    ["bytes32", "uint256", "address", "bytes32"],
    [
      keccak256(stringToHex("REGISTER_AGENT")),
      BigInt(chainId),
      agent,
      keccak256(stringToHex(moltbookHandle)),
    ],
  );
}

export function proofDigest(
  chainId: number,
  campaignId: bigint,
  agent: `0x${string}`,
  postUrl: string,
) {
  return packedDigest(
    ["bytes32", "uint256", "uint256", "address", "bytes32"],
    [
      keccak256(stringToHex("SUBMIT_PROOF")),
      BigInt(chainId),
      campaignId,
      agent,
      keccak256(stringToHex(postUrl)),
    ],
  );
}
