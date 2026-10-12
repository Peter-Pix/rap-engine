import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Nenalezeno",
};

export default function NotFound() {
  return (
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
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--re-accent)] text-zinc-950 font-semibold text-sm tracking-wide hover:bg-[var(--re-accent-dim)] transition-colors"
        >
          Zpět na hlavní stránku
        </Link>
      </div>
    </main>
  );
}
