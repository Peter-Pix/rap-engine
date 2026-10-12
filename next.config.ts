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
  experimental: {
    // Globální 404 — Next.js 16 nezachytí notFound() z dynamických rout do
    // app/not-found.tsx (v SSR vrací prázdný shell). global-not-found se
    // renderuje na úrovni routingu a vrací kompletní HTML. (12. 10. 2026)
    globalNotFound: true,
    // Omezení paralelních SSG workerů — 8GB MacBook Air padá na OOM,
    // když 7 workerů naráz renderuje obří rapper stránky (Yzomandias 271 tracků).
    // 2 workery = pomalejší build, ale bez swap death. (11. 10. 2026)
    cpus: 2,
  },
};

export default nextConfig;
