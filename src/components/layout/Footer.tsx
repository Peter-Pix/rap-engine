import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-mono text-lg font-black text-white">
              4rap
              <span className="text-[#e4ff1a]">.cz</span>
            </Link>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              Největší propojená databáze
              <br />
              české rapové scény.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Databáze
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/raperi"
                  className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Rappeři
                </Link>
              </li>
              <li>
                <Link
                  href="/alba"
                  className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Alba
                </Link>
              </li>
              <li>
                <Link
                  href="/skladby"
                  className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Skladby
                </Link>
              </li>
              <li>
                <Link
                  href="/labely"
                  className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Labely
                </Link>
              </li>
              <li>
                <Link
                  href="/zanry"
                  className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Žánry
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Magazín
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/clanky"
                  className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Články
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Engine
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Spojujeme českou rapovou scénu do jedné strukturované databáze.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
          <p className="text-xs text-zinc-600">© 2026 4rap.cz</p>
          <p className="text-xs font-mono text-zinc-700">RapEngine v1.0</p>
        </div>
      </div>
    </footer>
  );
}
