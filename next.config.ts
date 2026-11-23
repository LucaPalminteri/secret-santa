import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PLAYWRIGHT_TEST === "1" ? ".next-e2e" : ".next",
};

export default nextConfig;
