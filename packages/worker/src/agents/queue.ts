type Task<T> = () => Promise<T>;

const lanes = new Map<string, Promise<unknown>>();

export function resolveSessionLane(sessionKey: string): string {
  const normalized = sessionKey.trim().toLowerCase();
  return normalized || "session:main";
}

export function resolveGlobalLane(lane?: string): string {
  const normalized = (lane ?? "").trim().toLowerCase();
  return normalized || "global:settlement";
}

export async function enqueueCommandInLane<T>(lane: string, task: Task<T>): Promise<T> {
  const laneKey = lane.trim().toLowerCase() || "lane:default";
  const prev = lanes.get(laneKey) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(() => task());
  lanes.set(laneKey, next);
  try {
    return await next;
  } finally {
    if (lanes.get(laneKey) === next) {
      lanes.delete(laneKey);
    }
  }
}
