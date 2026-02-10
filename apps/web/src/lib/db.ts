import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makePrisma() {
  const url = process.env.DATABASE_URL ?? "";
  const sep = url.includes("?") ? "&" : "?";
  const pooledUrl = url.includes("connection_limit")
    ? url
    : `${url}${sep}connection_limit=5&pool_timeout=30&connect_timeout=15`;

  return new PrismaClient({
    log: ["warn"],
    datasourceUrl: pooledUrl,
  });
}

export const db = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

function sanitizeError(err: unknown): Error {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const code = err.code;
    if (code === "P1001") return new Error("Database is temporarily unreachable. Please try again.");
    if (code === "P2024") return new Error("Database connection pool exhausted. Please try again.");
    return new Error(`Database error (${code}). Please try again.`);
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new Error("Database connection failed. Please try again.");
  }
  if (err instanceof Error) {
    const msg = err.message.replace(/at\s+`[^`]+`/g, "at [redacted]");
    return new Error(msg);
  }
  return new Error("An unexpected database error occurred.");
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRetryable =
        (err instanceof Prisma.PrismaClientKnownRequestError &&
          ["P1001", "P2024"].includes(err.code)) ||
        err instanceof Prisma.PrismaClientInitializationError;

      if (isRetryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw sanitizeError(err);
    }
  }
  throw new Error("Database request failed after retries.");
}
