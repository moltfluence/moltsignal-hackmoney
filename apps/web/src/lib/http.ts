import { NextResponse } from "next/server";

export type ApiOk<T> = {
  success: true;
  data: T;
};

export type ApiErr = {
  success: false;
  error: string;
  hint?: string;
  retry_after_seconds?: number;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data } satisfies ApiOk<T>, init);
}

export function jsonErr(message: string, init?: { status?: number; hint?: string; retryAfterSeconds?: number }) {
  const status = init?.status ?? 400;
  const payload: ApiErr = {
    success: false,
    error: message,
    ...(init?.hint ? { hint: init.hint } : {}),
    ...(typeof init?.retryAfterSeconds === "number" ? { retry_after_seconds: init.retryAfterSeconds } : {}),
  };
  return NextResponse.json(payload, { status });
}

export function requestIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

