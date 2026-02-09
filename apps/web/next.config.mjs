// Load .env from monorepo root in local dev; Vercel injects env vars directly
try {
  const { config } = await import("dotenv");
  const { resolve, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(__dirname, "../../.env") });
} catch {
  // dotenv not available (e.g. Vercel production) – env vars come from dashboard
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@molt/shared", "@molt/worker"],
  experimental: {
    typedRoutes: true,
    externalDir: true,
  },
};

export default nextConfig;
