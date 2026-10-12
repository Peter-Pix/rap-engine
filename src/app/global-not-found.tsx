import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

/**
 * Globální 404 — obchází normální rendering (layout + segment not-found).
 *
 * PROČ: Next.js 16 nezachytí `notFound()` volané z dynamické routy do
 * `app/not-found.tsx` — v SSR vrací prázdný shell s NEXT_HTTP_ERROR_FALLBACK
 * a obsah dodá až klientská hydratace. Crawlery a uživatelé bez JS tak viděli
 * prázdnou stránku. `global-not-found` tomuto problému předchází tím, že se
 * renderuje na úrovni routingu a vrací kompletní HTML dokument.
 *
 * Pozn.: musí vracet <html> i <body> — neprochází přes root layout.
 */

export const metadata: Metadata = {
  title: "404 — Nenalezeno",
  description: "Stránka nenalezena. Prozkoumej mapu české rapové scény na 4rap.cz.",
};

export default function GlobalNotFound() {
  return (
    <html lang="cs">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="glass rounded-2xl p-10 md:p-14 max-w-lg w-full text-center">
            <div className="font-mono text-[11px] tracking-widest uppercase text-zinc-500 mb-4">
              404 — Nenalezeno
            </div>

            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">
              Již brzy
            </h1>

            <p className="text-lg text-zinc-400 mb-8">
              Tuhle stránku ještě stavíme. Zatím to tu trochu práší.
            </p>

            <div className="flex items-center justify-center gap-2 mb-10">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--re-accent)] animate-pulse" />
              <span className="font-mono text-[11px] text-[var(--re-accent)] tracking-widest uppercase">
                Work in progress
              </span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--re-accent)] text-zinc-950 font-semibold text-sm tracking-wide hover:bg-[var(--re-accent-dim)] transition-colors"
            >
              Zpět na hlavní stránku
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>

          <p className="mt-8 text-[11px] text-zinc-600 font-mono">
            4rap.cz knowledge graph — build v procesu
          </p>
        </main>
      </body>
    </html>
  );
}
