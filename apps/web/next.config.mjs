/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@molt/shared"],
  experimental: {
    typedRoutes: true,
    externalDir: true,
  },
};

export default nextConfig;
