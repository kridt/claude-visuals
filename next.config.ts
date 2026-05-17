import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["chokidar"],
  typedRoutes: true,
};

export default nextConfig;
