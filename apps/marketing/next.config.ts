import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@saas-shop/ui"],
};
export default nextConfig;
