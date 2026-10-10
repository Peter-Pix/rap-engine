import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack — explicit root to avoid watching entire /Users/
  turbopack: {
    root: process.cwd(),
  },
  // Dev: povolit přístup z lokální sítě (testování na mobilu).
  // Bez tohoto Next.js blokuje cross-origin HMR/JS requesty a klientský
  // JS se nikdy nenahydratuje → tlačítka (lupa, menu) jsou mrtvá.
  allowedDevOrigins: [
    "172.20.10.6",
    "172.20.10.*",
    "192.168.*",
    "10.*",
    "*.local",
    "localhost",
  ],
  // Static export-friendly — no server runtime needed
  output: "standalone",
  staticPageGenerationTimeout: 180, // 3 min (default 60s) — heavy entity pages
};

export default nextConfig;
