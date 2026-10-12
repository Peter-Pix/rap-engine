"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  computeCommonGround,
  computeSharedTracks,
  computeIndirectPath,
  computeSimilarityScore,
  commonGroundVerdict,
  trackRoleLabel,
  type CommonGroundEntity,
  type SharedTrack,
  type IndirectPath,
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
  collabOutbound: Record<string, Record<string, string[]>>;
  lookup: Record<string, LookupEntry>;
  tracks: CommonGroundEntity[];
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

  const accentColor = accent === "a" ? "var(--re-accent)" : "#c8962e";

  if (selected) {
    return (
      <div className="relative pl-4 py-1">
        {/* Tenká akcentní linka místo celého rámečku */}
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
          style={{ background: `linear-gradient(180deg, ${accentColor}cc, ${accentColor}22)` }}
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
        aria-label={label}
        className="w-full px-0 py-2.5 bg-transparent border-0 border-b border-white/[0.1] text-white text-[15px] placeholder:text-zinc-600 focus:outline-none transition-colors"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full max-h-72 overflow-y-auto rounded-2xl border border-white/[0.07] bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/60">
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
                    loading="lazy"
                    decoding="async"
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

export default function PorovnatClient({ artists, outbound, collabOutbound, lookup, tracks }: PorovnatClientProps) {
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
  }, [aId, bId, resolve, outbound]);

  const similarity = useMemo(() => {
    const a = asCg(aId);
    const b = asCg(bId);
    if (!a || !b || aId === bId) return null;
    return computeSimilarityScore(a, b);
  }, [aId, bId, outbound]);

  const sharedTracks: SharedTrack[] = useMemo(() => {
    if (!aId || !bId || aId === bId) return [];
    return computeSharedTracks(aId, bId, tracks, resolve);
  }, [aId, bId, tracks, resolve]);

  // Nepřímé propojení (Fáze 5): BFS přes graf spolupráce. Počítá se jen
  // když není přímá shoda — je to fallback pro dvojice, které „spojuje X".
  const indirectPath: IndirectPath | null = useMemo(() => {
    if (!aId || !bId || aId === bId) return null;
    if (sharedTracks.length > 0) return null;
    if (result && !result.isEmpty) return null;
    // Sloučíme artist outbound + track outbound do jedné adjacency.
    const full: Record<string, Record<string, string[]>> = {
      ...collabOutbound,
      ...outbound,
    };
    return computeIndirectPath(aId, bId, full, resolve);
  }, [aId, bId, collabOutbound, outbound, sharedTracks, result, resolve]);

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
        <div className="space-y-10">
          {/* ── VERDIKT ──────────────────────────────────────────────────
              Bez boxu. Velké číslo + věta. Prémiový produkt stojí na
              typografii, ne na rámečcích. */}
          <div className="pt-2 space-y-4">
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-black tabular-nums text-[var(--re-accent)] leading-none">
                {result.totalShared + sharedTracks.length}
              </span>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-1">
                  {result.totalShared + sharedTracks.length === 1
                    ? "společná vazba"
                    : "společných vazeb"}
                </div>
                <p className="text-lg text-zinc-200 leading-snug max-w-2xl">
                  {commonGroundVerdict(result)}
                </p>
              </div>
            </div>

            {/* Skóre podobnosti — vážené z žánrů/nálad/témat/stylů/labelů/scén */}
            {similarity && similarity.score > 0 && (
              <div className="max-w-md">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                    Skóre podobnosti
                  </span>
                  <span className="text-2xl font-black tabular-nums text-white leading-none">
                    {similarity.score}
                    <span className="text-sm font-mono font-normal text-zinc-500 ml-1">%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--re-accent)] transition-[width] duration-500"
                    style={{ width: `${similarity.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ⭐ SPOLEČNÉ SKLADBY — seznam bez boxů.
              Jedna hairline mezi řádky místo 4 borderů na kartu. */}
          {sharedTracks.length > 0 && (
            <section>
              <div className="flex items-baseline gap-2.5 mb-1">
                <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[var(--re-accent)]">
                  Společné skladby
                </h2>
                <span className="text-[11px] font-mono text-zinc-600">
                  {String(sharedTracks.length).padStart(2, "0")}
                </span>
              </div>
              <div className="divide-y divide-white/[0.05] border-t border-white/[0.07]">
                {sharedTracks.map((t) => (
                  <Link
                    key={t.id}
                    href={t.url}
                    className="group flex items-center justify-between gap-4 py-3 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
                        {t.title}
                      </div>
                      {t.primaryTitle && (
                        <div className="text-xs text-zinc-600 truncate mt-0.5">
                          {t.primaryTitle}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono uppercase tracking-wider">
                      <span className="text-[var(--re-accent)]/75">
                        {aSel?.title} · {trackRoleLabel(t.roleA)}
                      </span>
                      <span className="text-zinc-700">/</span>
                      <span className="text-[#c8962e]/85">
                        {bSel?.title} · {trackRoleLabel(t.roleB)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Skupiny shod */}
          {result.isEmpty && sharedTracks.length === 0 ? (
            indirectPath ? (
              <section>
                <div className="flex items-baseline gap-2.5 mb-3">
                  <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[var(--re-accent)]">
                    Nepřímé propojení
                  </h2>
                  <span className="text-[11px] font-mono text-zinc-600">
                    {String(indirectPath.length).padStart(2, "0")}{" "}
                    {indirectPath.length === 1 ? "krok" : indirectPath.length < 5 ? "kroky" : "kroků"}
                  </span>
                </div>
                <p className="text-[15px] text-zinc-400 mb-5 max-w-2xl">
                  {aSel?.title} a {bSel?.title} spolu nikdy nenahráli přímo.
                  Spojuje je ale cesta v síti spolupráce:
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
                  {indirectPath.hops.map((hop, i) => (
                    <span key={`${hop.viaId}-${i}`} className="flex items-center gap-3">
                      {i > 0 && (
                        <span className="text-zinc-700 text-sm font-mono">→</span>
                      )}
                      {hop.label && (
                        <span className="text-[11px] text-zinc-600 font-mono uppercase tracking-widest">
                          {hop.label}
                        </span>
                      )}
                      <Link
                        href={hop.viaUrl}
                        className="text-[15px] text-zinc-300 underline decoration-zinc-700 decoration-dotted underline-offset-4 hover:text-[var(--re-accent)] hover:decoration-[var(--re-accent)]/50 transition-colors"
                      >
                        {hop.viaTitle}
                      </Link>
                    </span>
                  ))}
                </div>
              </section>
            ) : (
              <div className="py-14 border-t border-white/[0.06]">
                <p className="text-zinc-300 text-lg mb-1.5">
                  {aSel?.title} a {bSel?.title} nemají žádnou přímou shodu.
                </p>
                <p className="text-zinc-600 text-sm">
                  Zkus jinou dvojici — scéna je velká.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-7">
              {result.groups.map((group) => (
                <section key={group.key}>
                  <div className="flex items-baseline gap-2.5 mb-3">
                    <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      {group.label}
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-700">
                      {String(group.items.length).padStart(2, "0")}
                    </span>
                  </div>
                  {/* Žádné pilulky. Prostý text s tečkovým podtržením. */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.url}
                        className="text-[15px] text-zinc-400 underline decoration-zinc-700 decoration-dotted underline-offset-4 hover:text-[#c8962e] hover:decoration-[#c8962e]/50 transition-colors"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Odkazy na profily — bez horní linky, jen vzduch */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[15px]">
            <Link
              href={`/raperi/${aSel?.slug}`}
              className="text-zinc-500 hover:text-[var(--re-accent)] transition-colors"
            >
              {aSel?.title} →
            </Link>
            <Link
              href={`/raperi/${bSel?.slug}`}
              className="text-zinc-500 hover:text-[#c8962e] transition-colors"
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
