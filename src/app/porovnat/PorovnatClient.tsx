"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  computeCommonGround,
  commonGroundVerdict,
  type CommonGroundEntity,
} from "@/lib/content/common-ground";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ComparePickerItem {
  id: string;
  slug: string;
  title: string;
  image?: string | null;
}

interface LookupEntry {
  id: string;
  type: string;
  slug: string;
  title: string;
}

interface PorovnatClientProps {
  artists: ComparePickerItem[];
  outbound: Record<string, Record<string, string[]>>;
  lookup: Record<string, LookupEntry>;
}

// ─── Picker (autocomplete pro jednoho rappera) ──────────────────────────────

interface PickerProps {
  label: string;
  accent: "a" | "b";
  artists: ComparePickerItem[];
  value: string | null;
  onChange: (id: string | null) => void;
}

function ArtistPicker({ label, accent, artists, value, onChange }: PickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = value ? artists.find((a) => a.id === value) : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return artists.slice(0, 8);
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return artists
      .filter((a) => norm(a.title).includes(norm(q)))
      .slice(0, 8);
  }, [query, artists]);

  // klik mimo zavře
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const accentColor = accent === "a" ? "#e4ff1a" : "#c8962e";

  if (selected) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2">
          {label}
        </div>
        <div className="flex items-center gap-3">
          {selected.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.image}
              alt={selected.title}
              className="w-12 h-12 rounded-full object-cover ring-2 shrink-0"
              style={{ boxShadow: `0 0 0 2px ${accentColor}` }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-black"
              style={{ background: `${accentColor}22`, color: accentColor }}
            >
              {selected.title.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white truncate">{selected.title}</div>
            <Link
              href={`/raperi/${selected.slug}`}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
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
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2">
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
        aria-label={label}
        className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-white/[0.1] bg-zinc-900 shadow-2xl shadow-black/50">
          {results.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
              >
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.image}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {a.title.charAt(0)}
                  </div>
                )}
                <span className="text-sm text-zinc-200 truncate">{a.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function PorovnatClient({ artists, outbound, lookup }: PorovnatClientProps) {
  const params = useSearchParams();
  const router = useRouter();

  const [aId, setAId] = useState<string | null>(params.get("a"));
  const [bId, setBId] = useState<string | null>(params.get("b"));

  // URL sync — sdílitelné odkazy
  const syncUrl = useCallback(
    (a: string | null, b: string | null) => {
      const qs = new URLSearchParams();
      if (a) qs.set("a", a);
      if (b) qs.set("b", b);
      const url = qs.toString() ? `/porovnat?${qs}` : "/porovnat";
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const setA = (id: string | null) => {
    setAId(id);
    syncUrl(id, bId);
  };
  const setB = (id: string | null) => {
    setBId(id);
    syncUrl(aId, id);
  };

  // Entita → CommonGroundEntity (s outbound)
  const asCg = (id: string | null): CommonGroundEntity | null => {
    if (!id) return null;
    const meta = lookup[id];
    if (!meta) return null;
    return { ...meta, outbound: outbound[id] ?? {} };
  };

  const resolve = useCallback(
    (id: string): CommonGroundEntity | undefined => {
      const m = lookup[id];
      return m ? { ...m, outbound: {} } : undefined;
    },
    [lookup],
  );

  const result = useMemo(() => {
    const a = asCg(aId);
    const b = asCg(bId);
    if (!a || !b || aId === bId) return null;
    return computeCommonGround(a, b, resolve);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aId, bId, resolve, outbound]);

  const aSel = aId ? artists.find((x) => x.id === aId) : null;
  const bSel = bId ? artists.find((x) => x.id === bId) : null;

  return (
    <div className="space-y-8">
      {/* Pickery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ArtistPicker
          label="Rapper A"
          accent="a"
          artists={artists}
          value={aId}
          onChange={setA}
        />
        <ArtistPicker
          label="Rapper B"
          accent="b"
          artists={artists}
          value={bId}
          onChange={setB}
        />
      </div>

      {/* Výsledky */}
      {aId && bId && aId === bId && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          Vyber dva různé rappery.
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Hlavička s verdictem */}
          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/40 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-[#e4ff1a]">
                {result.totalShared}
              </span>
              <span className="text-sm text-zinc-400">
                {result.totalShared === 1
                  ? "společná vazba"
                  : result.totalShared < 5
                    ? "společné vazby"
                    : "společných vazeb"}
              </span>
            </div>
            <div className="text-sm text-zinc-300 italic">
              {commonGroundVerdict(result)}
            </div>
          </div>

          {/* Skupiny shod */}
          {result.isEmpty ? (
            <div className="text-center py-16">
              <p className="text-zinc-400 text-lg mb-2">
                {aSel?.title} a {bSel?.title} nemají žádnou přímou shodu.
              </p>
              <p className="text-zinc-600 text-sm">
                Zkus jinou dvojici — scéna je velká.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {result.groups.map((group) => (
                <section key={group.key}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                      {group.label}
                    </h2>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.url}
                        className="text-sm px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 hover:bg-[#c8962e] hover:text-zinc-950 transition-all"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Odkazy na profily */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-white/[0.06] text-sm">
            <Link
              href={`/raperi/${aSel?.slug}`}
              className="text-zinc-400 hover:text-[#e4ff1a] transition-colors"
            >
              {aSel?.title} →
            </Link>
            <Link
              href={`/raperi/${bSel?.slug}`}
              className="text-zinc-400 hover:text-[#c8962e] transition-colors"
            >
              {bSel?.title} →
            </Link>
          </div>
        </div>
      )}

      {/* Prázdný stav */}
      {(!aId || !bId) && (
        <div className="text-center py-12 text-zinc-600 text-sm">
          Vyber oba rappery a uvidíš, co mají společného.
        </div>
      )}
    </div>
  );
}
