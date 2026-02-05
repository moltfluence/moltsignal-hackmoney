export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export function getChainId(): number {
  return Number(process.env.ARC_CHAIN_ID ?? 5042002);
}

export function getAllowlist(): string[] {
  return (process.env.MOLTBOOK_ALLOWLIST ?? "moltbook.com,www.moltbook.com")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
