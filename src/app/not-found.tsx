import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="glass rounded-2xl p-10 md:p-14 max-w-lg w-full text-center">
        {/* Status code */}
        <div className="font-mono text-xs tracking-widest uppercase text-zinc-500 mb-4">
          404 — Nenalezeno
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">
          Již brzy
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-zinc-400 mb-8">
          Tuhle stránku ještě stavíme. Zatím to tu trochu práší.
        </p>

        {/* Decorative blinker */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="inline-block w-2 h-2 rounded-full bg-[#e4ff1a] animate-pulse" />
          <span className="font-mono text-xs text-[#e4ff1a] tracking-widest uppercase">
            Work in progress
          </span>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#e4ff1a] text-zinc-950 font-semibold text-sm tracking-wide hover:bg-[#b8cc14] transition-colors"
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

      {/* Footer hint */}
      <p className="mt-8 text-xs text-zinc-600 font-mono">
        4rap.cz knowledge graph — build v procesu
      </p>
    </main>
  );
}
