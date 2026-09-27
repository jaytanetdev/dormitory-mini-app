import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output:
    process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : undefined,
  reactStrictMode: true,
  webpack(config, { dev }) {
    // Only the isolated E2E development server replaces the external LINE SDK.
    if (dev && process.env.E2E_LIFF === "1")
      config.resolve.alias["@line/liff"] =
        path.resolve(process.cwd(), "e2e/liff-stub.cjs");
    return config;
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
