import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@niskala/sdk"],
  turbopack: { root: resolve(__dirname, "../..") },
};

export default nextConfig;
