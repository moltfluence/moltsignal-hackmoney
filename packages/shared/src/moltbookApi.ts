import type { InteractionActor } from "./types.js";

export type MoltbookApiConfig = {
  baseUrl?: string;
  apiKey: string;
  commentsLimit?: number;
  profileLookupLimit?: number;
  enableVotesList?: boolean;
  enableRepostsList?: boolean;
};

function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

function safeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function extractPostId(postUrl: string): string | null {
  try {
    const parsed = new URL(postUrl);
    const m = parsed.pathname.match(/\/posts\/([^\/?#]+)/i);
    if (m?.[1]) return m[1];
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length >= 6) return last;
  } catch {
    // ignore
  }
  return null;
}

async function fetchJson(url: string, apiKey: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
      "user-agent": "MoltSignal/0.1",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Moltbook API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

function extractCommentAuthorHandle(comment: unknown): string | null {
  if (!comment || typeof comment !== "object") return null;
  const obj = comment as Record<string, unknown>;
  const direct =
    (typeof obj.author_handle === "string" && obj.author_handle) ||
    (typeof obj.authorHandle === "string" && obj.authorHandle) ||
    (typeof obj.handle === "string" && obj.handle) ||
    (typeof obj.author === "string" && obj.author) ||
    null;
  if (direct) return direct;

  const authorObj = (obj.author ?? obj.user ?? obj.agent) as unknown;
  if (authorObj && typeof authorObj === "object") {
    const a = authorObj as Record<string, unknown>;
    const nested =
      (typeof a.handle === "string" && a.handle) ||
      (typeof a.name === "string" && a.name) ||
      (typeof a.username === "string" && a.username) ||
      null;
    if (nested) return nested;
  }
  return null;
}

async function fetchCommentsHandles(
  baseUrl: string,
  apiKey: string,
  postId: string,
  limit: number,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const perPage = Math.min(100, Math.max(10, limit));
  let fetched = 0;
  let cursor: string | undefined;

  for (let page = 0; page < 5 && fetched < limit; page += 1) {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/posts/${encodeURIComponent(postId)}/comments`);
    url.searchParams.set("limit", String(perPage));
    url.searchParams.set("sort", "top");
    if (cursor) url.searchParams.set("cursor", cursor);

    const json = (await fetchJson(url.toString(), apiKey)) as any;
    const list: unknown[] =
      (Array.isArray(json?.comments) && json.comments) ||
      (Array.isArray(json?.data) && json.data) ||
      (Array.isArray(json?.items) && json.items) ||
      [];

    if (!Array.isArray(list) || list.length === 0) break;
    for (const item of list) {
      if (fetched >= limit) break;
      const handleRaw = extractCommentAuthorHandle(item);
      if (!handleRaw) continue;
      const handle = normalizeHandle(handleRaw);
      if (!handle) continue;
      counts.set(handle, (counts.get(handle) ?? 0) + 1);
      fetched += 1;
    }

    cursor =
      (typeof json?.nextCursor === "string" && json.nextCursor) ||
      (typeof json?.cursor === "string" && json.cursor) ||
      undefined;
    if (!cursor) break;
  }

  return counts;
}

async function fetchHandleListBestEffort(
  baseUrl: string,
  apiKey: string,
  path: string,
): Promise<string[]> {
  try {
    const json = (await fetchJson(`${baseUrl.replace(/\/$/, "")}${path}`, apiKey)) as any;
    const list: unknown[] =
      (Array.isArray(json?.handles) && json.handles) ||
      (Array.isArray(json?.data) && json.data) ||
      (Array.isArray(json?.items) && json.items) ||
      [];
    const handles = list
      .map((x) => (typeof x === "string" ? x : null))
      .filter(Boolean)
      .map((h) => normalizeHandle(h as string))
      .filter(Boolean);
    return handles;
  } catch {
    return [];
  }
}

async function fetchProfileBestEffort(
  baseUrl: string,
  apiKey: string,
  handle: string,
): Promise<{ reach?: number; verified?: boolean } | null> {
  try {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/agents/profile`);
    url.searchParams.set("name", handle);
    const json = (await fetchJson(url.toString(), apiKey)) as any;
    const reach = safeNumber(json?.reach ?? json?.data?.reach ?? json?.profile?.reach);
    const verified =
      typeof (json?.verified ?? json?.data?.verified ?? json?.profile?.verified) === "boolean"
        ? Boolean(json?.verified ?? json?.data?.verified ?? json?.profile?.verified)
        : undefined;
    return { reach, verified };
  } catch {
    return null;
  }
}

export async function fetchMoltbookInteractionsFromApi(
  postUrl: string,
  config: MoltbookApiConfig,
): Promise<InteractionActor[]> {
  const baseUrl = config.baseUrl ?? "https://www.moltbook.com/api/v1";
  const postId = extractPostId(postUrl);
  if (!postId) {
    throw new Error("unable to derive Moltbook postId from URL");
  }

  const commentsLimit = config.commentsLimit ?? 200;
  const commentCounts = await fetchCommentsHandles(baseUrl, config.apiKey, postId, commentsLimit);

  const voteHandles =
    config.enableVotesList === true
      ? await fetchHandleListBestEffort(baseUrl, config.apiKey, `/posts/${encodeURIComponent(postId)}/votes`)
      : [];
  const repostHandles =
    config.enableRepostsList === true
      ? await fetchHandleListBestEffort(baseUrl, config.apiKey, `/posts/${encodeURIComponent(postId)}/reposts`)
      : [];

  const merged = new Map<string, InteractionActor>();
  for (const [handle, count] of commentCounts.entries()) {
    merged.set(handle, {
      handle,
      counts: { comments: count, votes: 0, reposts: 0 },
    });
  }
  for (const handle of voteHandles) {
    const prev = merged.get(handle);
    merged.set(handle, {
      handle,
      reach: prev?.reach,
      verified: prev?.verified,
      counts: {
        comments: prev?.counts.comments ?? 0,
        votes: (prev?.counts.votes ?? 0) + 1,
        reposts: prev?.counts.reposts ?? 0,
      },
    });
  }
  for (const handle of repostHandles) {
    const prev = merged.get(handle);
    merged.set(handle, {
      handle,
      reach: prev?.reach,
      verified: prev?.verified,
      counts: {
        comments: prev?.counts.comments ?? 0,
        votes: prev?.counts.votes ?? 0,
        reposts: (prev?.counts.reposts ?? 0) + 1,
      },
    });
  }

  const actors = [...merged.values()];
  actors.sort((a, b) => a.handle.localeCompare(b.handle));

  const profileLookupLimit = config.profileLookupLimit ?? 25;
  if (profileLookupLimit > 0) {
    // Enrich top actors by total signal (still deterministic because we sort by signal desc + handle).
    const scored = [...actors]
      .map((a) => ({ a, s: (a.counts.comments ?? 0) + (a.counts.votes ?? 0) + (a.counts.reposts ?? 0) }))
      .sort((x, y) => (y.s - x.s) || x.a.handle.localeCompare(y.a.handle))
      .slice(0, profileLookupLimit);

    for (const item of scored) {
      const profile = await fetchProfileBestEffort(baseUrl, config.apiKey, item.a.handle);
      if (!profile) continue;
      item.a.reach = typeof profile.reach === "number" ? profile.reach : item.a.reach;
      item.a.verified = typeof profile.verified === "boolean" ? profile.verified : item.a.verified;
    }
  }

  return actors;
}

