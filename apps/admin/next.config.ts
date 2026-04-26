import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@saas-shop/ui"],
  // NOTE: /auth/* and /api/* are proxied at runtime via route handlers
  // in src/app/auth/[...path]/route.ts and src/app/api/[...path]/route.ts
  // so that NEXT_PUBLIC_API_URL is read at request-time, not baked at build-time.
};
export default nextConfig;
