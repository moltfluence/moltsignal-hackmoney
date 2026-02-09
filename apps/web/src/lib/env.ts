export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export function getChainId(): number {
  const raw = process.env.ARC_CHAIN_ID;
  const id = Number(raw ?? 5042002);
  if (!Number.isFinite(id)) {
    throw new Error(`Invalid ARC_CHAIN_ID: ${raw}`);
  }
  return id;
}

export function getAllowlist(): string[] {
  return (process.env.MOLTBOOK_ALLOWLIST ?? "moltbook.com,www.moltbook.com")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
