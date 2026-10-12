"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CestaArtistItem {
  id: string;
  slug: string;
  title: string;
  image?: string | null;
}

interface PathStep {
  id: string;
  type: string;
  slug: string;
  title: string;
  relationLabel: string;
  relation: string;
}

interface PathResult {
  found: boolean;
  distance: number;
  steps: PathStep[];
  explored: number;
}

// ─── Picker (autocomplete pro jednoho rappera) ──────────────────────────────

function ArtistPicker({
  label,
  artists,
  value,
  onChange,
}: {
  label: string;
  artists: CestaArtistItem[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = value ? artists.find((a) => a.id === value) : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return artists.slice(0, 8);
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return artists.filter((a) => norm(a.title).includes(norm(q))).slice(0, 8);
  }, [query, artists]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (selected) {
    return (
      <div className="relative pl-4 py-1">
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
          style={{ background: "linear-gradient(180deg, #c8962ecc, #c8962e22)" }}
        />
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-600 mb-2">
          {label}
        </div>
        <div className="flex items-center gap-3">
          {selected.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.image}
              alt={selected.title}
              loading="lazy"
              decoding="async"
              className="w-12 h-12 rounded-full object-cover shrink-0"
              style={{ boxShadow: "0 0 0 2px #c8962e" }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-black bg-[#c8962e22] text-[#c8962e]">
              {selected.title.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white truncate">{selected.title}</div>
            <Link href={`/raperi/${selected.slug}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Zobrazit profil →
            </Link>
          </div>
          <button
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            aria-label="Změnit"
            className="text-xs text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md transition-colors shrink-0"
          >
            Změnit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-600 mb-2">
        {label}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Hledej rappera…"
        className="w-full bg-transparent border-b border-white/10 focus:border-[#c8962e] outline-none text-white text-lg py-2 placeholder:text-zinc-600 transition-colors"
      />
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-[#121212] border border-white/10 rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-500">Nic nenalezeno</div>
          ) : (
            results.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onChange(a.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-colors"
              >
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[#c8962e22] text-[#c8962e]">
                    {a.title.charAt(0)}
                  </div>
                )}
                <span className="text-sm text-white/80 truncate">{a.title}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hlavní komponenta ─────────────────────────────────────────────────────

export default function CestaClient({ artists }: { artists: CestaArtistItem[] }) {
  const params = useSearchParams();
  const fromParam = params.get("from");
  const [from, setFrom] = useState<string | null>(fromParam);
  const [to, setTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PathResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSearch = from && to && from !== to;

  const search = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/cesta?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Něco se pokazilo");
      } else {
        setResult(data);
      }
    } catch {
      setError("Síťová chyba");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  return (
    <main className="min-h-screen pt-28 sm:pt-36 pb-24 px-6 sm:px-12 max-w-4xl mx-auto">
      <header className="mb-12">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#c8962e] mb-3">
          Rap graph
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
          Cesta mezi rappery
        </h1>
        <p className="text-white/50 mt-4 text-base sm:text-lg leading-relaxed max-w-2xl">
          Vyber dva rappery a zjisti, jak jsou propojení — přes featy, producenty,
          labely, skupiny i scény. Nejkratší <em>smysluplná</em> cesta v grafu 47&nbsp;000 vazeb.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
        <ArtistPicker label="Od" artists={artists} value={from} onChange={setFrom} />
        <ArtistPicker label="K" artists={artists} value={to} onChange={setTo} />
      </div>

      <div className="mb-12">
        <button
          onClick={search}
          disabled={!canSearch || loading}
          className="px-6 py-3 rounded-full bg-[#c8962e] text-black font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d8a53a] transition-colors"
        >
          {loading ? "Hledám…" : "Najdi cestu"}
        </button>
        {from && to && from === to && (
          <p className="text-xs text-zinc-500 mt-2">Vyber dva různé rappery.</p>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-8">{error}</p>
      )}

      {result && result.found && (
        <section className="border-t border-white/10 pt-8">
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40">
              Cesta
            </h2>
            <span className="text-xs text-zinc-500">
              {result.distance} {result.distance === 1 ? "krok" : result.distance < 5 ? "kroky" : "kroků"}
            </span>
          </div>

          <ol className="flex flex-col gap-0">
            {result.steps.map((step, i) => {
              const isPerson = step.type === "artist";
              return (
                <li key={i} className="flex flex-col">
                  {i > 0 && (
                    <div className="flex items-center gap-3 my-1 pl-6">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#c8962e]/70">
                        {step.relationLabel}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <Link
                    href={`/${step.type === "artist" ? "raperi" : step.type === "album" ? "alba" : step.type === "track" ? "skladby" : step.type + "y"}/${step.slug}`}
                    className="group flex items-center gap-3 py-2 px-4 -mx-4 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isPerson ? "bg-[#c8962e] text-black" : "bg-white/10 text-white/60"
                      }`}
                    >
                      {step.title.charAt(0)}
                    </span>
                    <span className={`text-sm ${isPerson ? "text-white font-semibold" : "text-white/70"}`}>
                      {step.title}
                    </span>
                    {!isPerson && (
                      <span className="text-[10px] font-mono uppercase text-zinc-500 ml-auto">
                        {step.type}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {result && !result.found && (
        <section className="border-t border-white/10 pt-8">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-3">
            Žádná cesta
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xl">
            Mezi těmito rappery jsme nenašli propojení (prohledáno {result.explored} uzlů).
            Zkus jinou dvojici — nebo je to dvojice, která se zatím v grafu nepotkala.
          </p>
        </section>
      )}
    </main>
  );
}
