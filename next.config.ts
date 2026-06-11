import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export-friendly — no server runtime needed
  output: "standalone",
};

export default nextConfig;
