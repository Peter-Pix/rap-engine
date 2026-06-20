"use client";

/**
 * Global error boundary — zobrazí se když selže root layout nebo
 * když chyba vznikne mimo route segment.
 *
 * Důležité: TENTO soubor MUSÍ být client component a MUSÍ obsahovat
 * vlastní <html> a <body> tagy, protože root layout může být rozbitý.
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for debugging — global error = vážná situace
    console.error("[Global error boundary]", error);
  }, [error]);

  return (
    <html lang="cs">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="max-w-lg w-full text-center">
            {/* Status code */}
            <div className="font-mono text-xs tracking-widest uppercase text-zinc-500 mb-4">
              FATAL ERROR
            </div>

            {/* Main heading */}
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">
              Aplikace spadla
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-zinc-400 mb-8">
              Něco se pokazilo mimo běžnou stránku. Zkus obnovit, nebo se vrať později.
            </p>

            {/* Error digest (for support) */}
            {error.digest && (
              <p className="text-xs text-zinc-600 font-mono mb-6">
                ID: {error.digest}
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#e4ff1a] text-zinc-950 font-semibold text-sm tracking-wide hover:bg-[#b8cc14] transition-colors"
              >
                Zkusit znovu
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/[0.12] text-zinc-200 font-medium text-sm tracking-wide hover:bg-white/[0.06] transition-colors"
              >
                Hlavní strana
              </a>
            </div>

            <p className="mt-8 text-xs text-zinc-600 font-mono">
              4rap.cz knowledge graph — build v procesu
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}