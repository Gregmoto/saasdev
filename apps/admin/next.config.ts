import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  transpilePackages: ["@saas-shop/ui"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/auth/:path*`,
      },
    ];
  },
};
export default nextConfig;
