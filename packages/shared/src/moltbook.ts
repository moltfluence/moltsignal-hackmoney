import type { AgentMetricsSnapshot, WalletAddress } from "./types.js";

const METRIC_PATTERNS = {
  impressions: /impressions?[^0-9]*([0-9,.kKmM]+)/i,
  likes: /likes?[^0-9]*([0-9,.kKmM]+)/i,
  comments: /comments?[^0-9]*([0-9,.kKmM]+)/i,
  reposts: /reposts?|retweets?[^0-9]*([0-9,.kKmM]+)/i,
};

function parseMetric(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match?.[1]) {
    return 0;
  }
  const value = match[1].replace(/,/g, "").toLowerCase();
  if (value.endsWith("k")) {
    return Math.round(Number(value.slice(0, -1)) * 1_000);
  }
  if (value.endsWith("m")) {
    return Math.round(Number(value.slice(0, -1)) * 1_000_000);
  }
  return Number(value) || 0;
}

export function isAllowedMoltbookHost(url: URL, allowlist: string[]): boolean {
  return allowlist.includes(url.hostname.toLowerCase());
}

export async function fetchMoltbookSnapshot(
  postUrl: string,
  allowlist: string[],
): Promise<AgentMetricsSnapshot> {
  const parsed = new URL(postUrl);
  if (!isAllowedMoltbookHost(parsed, allowlist)) {
    throw new Error(`Host ${parsed.hostname} is not in Moltbook allowlist`);
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    headers: {
      "user-agent": "MoltSignalWorker/0.1",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Moltbook URL: ${response.status}`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);

  // This parser intentionally uses resilient regexes because Moltbook markup may evolve.
  const snapshot: AgentMetricsSnapshot = {
    impressions: parseMetric(html, METRIC_PATTERNS.impressions),
    likes: parseMetric(html, METRIC_PATTERNS.likes),
    comments: parseMetric(html, METRIC_PATTERNS.comments),
    reposts: parseMetric(html, METRIC_PATTERNS.reposts),
    interactingAgents: [] as WalletAddress[],
    fetchedAt: new Date().toISOString(),
    sourceUrl: parsed.toString(),
    title: titleMatch?.[1]?.trim(),
  };

  return snapshot;
}
