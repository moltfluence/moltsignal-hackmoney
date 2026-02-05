import { keccak256, toBytes } from "viem";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function hashCanonicalJson(value: unknown): `0x${string}` {
  return keccak256(toBytes(canonicalizeJson(value)));
}

export function parseNumberLike(raw: string): number {
  const normalized = raw.trim().replace(/,/g, "").toLowerCase();
  if (normalized.endsWith("k")) {
    return Math.round(Number(normalized.slice(0, -1)) * 1_000);
  }
  if (normalized.endsWith("m")) {
    return Math.round(Number(normalized.slice(0, -1)) * 1_000_000);
  }
  return Number(normalized) || 0;
}
