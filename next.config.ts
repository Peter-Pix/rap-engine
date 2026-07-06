import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack — explicit root to avoid watching entire /Users/
  turbopack: {
    root: process.cwd(),
  },
  // Ignore large/generated directories to prevent HMR storms
  watchOptions: {
    ignored: ["**/.content-cache/**", "**/.next/**", "**/.backups/**", "**/node_modules/**"],
  },
  // Static export-friendly — no server runtime needed
  output: "standalone",
  staticPageGenerationTimeout: 180, // 3 min (default 60s) — heavy entity pages
};

export default nextConfig;
