import type { AgentMetricsSnapshot, WalletAddress } from "./types.js";
import { fetchMoltbookInteractionsFromApi, type MoltbookApiConfig } from "./moltbookApi.js";

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

function safeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function readFirstNumber(obj: any, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = obj?.[key];
    const n = safeNumber(value);
    if (typeof n === "number") return n;
  }
  return undefined;
}

export async function fetchMoltbookSnapshotV2(
  postUrl: string,
  allowlist: string[],
  api?: MoltbookApiConfig,
): Promise<AgentMetricsSnapshot> {
  // Always validate host.
  const parsed = new URL(postUrl);
  if (!isAllowedMoltbookHost(parsed, allowlist)) {
    throw new Error(`Host ${parsed.hostname} is not in Moltbook allowlist`);
  }

  // Default metrics source is the resilient HTML parser.
  let base = await fetchMoltbookSnapshot(postUrl, allowlist);

  if (api?.apiKey) {
    // Best-effort: fetch deterministic interaction ledger from the Moltbook API.
    const actors = await fetchMoltbookInteractionsFromApi(postUrl, api).catch(() => []);

    // Attempt to read more reliable counts from the post payload, if the API exposes them.
    // We do not fail if this isn't available; HTML parser remains the fallback.
    try {
      const baseUrl = api.baseUrl ?? "https://www.moltbook.com/api/v1";
      const idMatch = parsed.pathname.match(/\/posts\/([^\/?#]+)/i);
      const postId = idMatch?.[1] ?? parsed.pathname.split("/").filter(Boolean).slice(-1)[0];
      if (postId) {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/posts/${encodeURIComponent(postId)}`, {
          method: "GET",
          headers: {
            authorization: `Bearer ${api.apiKey}`,
            accept: "application/json",
            "user-agent": "MoltSignal/0.1",
          },
        });
        if (res.ok) {
          const json: any = await res.json().catch(() => null);
          const impressions = readFirstNumber(json, ["impressions", "views", "viewCount", "view_count"]);
          const likes = readFirstNumber(json, ["likes", "likeCount", "like_count", "upvotes"]);
          const comments = readFirstNumber(json, ["comments", "commentCount", "comment_count"]);
          const reposts = readFirstNumber(json, ["reposts", "repostCount", "repost_count", "shares"]);

          // Extract author handle for verification
          const authorHandle =
            (typeof json?.author_handle === "string" && json.author_handle) ||
            (typeof json?.authorHandle === "string" && json.authorHandle) ||
            (typeof json?.author?.handle === "string" && json.author.handle) ||
            (typeof json?.author?.name === "string" && json.author.name) ||
            (typeof json?.author === "string" && json.author) ||
            (typeof json?.handle === "string" && json.handle) ||
            undefined;

          // Extract post content for keyword verification
          const postContent =
            (typeof json?.content === "string" && json.content) ||
            (typeof json?.body === "string" && json.body) ||
            (typeof json?.text === "string" && json.text) ||
            (typeof json?.description === "string" && json.description) ||
            undefined;

          base = {
            ...base,
            impressions: impressions ?? base.impressions,
            likes: likes ?? base.likes,
            comments: comments ?? base.comments,
            reposts: reposts ?? base.reposts,
            ...(authorHandle ? { authorHandle: authorHandle.trim().toLowerCase() } : {}),
            ...(postContent ? { content: postContent } : {}),
          };
        }
      }
    } catch {
      // ignore
    }

    const totalSignals = actors.reduce((acc, a) => {
      const c = a.counts?.comments ?? 0;
      const v = a.counts?.votes ?? 0;
      const r = a.counts?.reposts ?? 0;
      return acc + (1.0 * c + 0.3 * v + 0.8 * r);
    }, 0);

    base = {
      ...base,
      interactions: {
        actors,
        totals: {
          uniqueActors: actors.filter((a) => (a.handle ?? "").trim().length > 0).length,
          totalSignals,
        },
      },
    };
  }

  return base;
}
