"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Track runtime errors for observability
    trackEvent("error_boundary_triggered", {
      message: error.message,
      digest: error.digest ?? "",
      stack: error.stack?.slice(0, 500) ?? "",
    });
    console.error("[Error boundary]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="glass rounded-2xl p-10 md:p-14 max-w-lg w-full text-center">
        {/* Status code */}
        <div className="font-mono text-xs tracking-widest uppercase text-zinc-500 mb-4">
          500 — Chyba
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">
          Něco se rozsypalo
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-zinc-400 mb-8">
          Stránka narazila na nečekanou chybu. Zkus to znovu, nebo se vrať na hlavní.
        </p>

        {/* Error digest (for support) */}
        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono mb-6">
            ID: {error.digest}
          </p>
        )}

        {/* Decorative blinker */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-xs text-red-400 tracking-widest uppercase">
            Runtime error
          </span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#e4ff1a] text-zinc-950 font-semibold text-sm tracking-wide hover:bg-[#b8cc14] transition-colors"
          >
            Zkusit znovu
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/[0.12] text-zinc-200 font-medium text-sm tracking-wide hover:bg-white/[0.06] transition-colors"
          >
            Hlavní strana
          </Link>
        </div>
      </div>

      {/* Footer hint */}
      <p className="mt-8 text-xs text-zinc-600 font-mono">
        4rap.cz knowledge graph — build v procesu
      </p>
    </main>
  );
}