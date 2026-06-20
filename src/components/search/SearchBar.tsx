"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MiniSearch from "minisearch";
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_COLORS } from "@/lib/search";
import { trackSearch, trackSearchResultClick } from "@/lib/analytics";
import type { SearchDocument } from "@/lib/search";
import type { EntityType } from "@/lib/content/constants";

const MAX_RESULTS = 8;

export interface SearchBarProps {
  /** Called whenever a search result is selected (Link click or Enter key). */
  onResultClick?: () => void;
}

const stripDiacritics = (term: string): string =>
  term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function SearchBar({ onResultClick }: SearchBarProps = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState<MiniSearch<SearchDocument> | null>(null);
  const [docs, setDocs] = useState<Map<string, SearchDocument>>(new Map());
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  // ─── LAZY LOAD INDEX ────────────────────────────────────
  const loadIndex = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/search-index");
      if (!res.ok) throw new Error(`Search index fetch failed: ${res.status}`);
      const data = await res.json();
      const rawDocuments: SearchDocument[] = Array.isArray(data)
        ? data
        : data.documents;
      if (!Array.isArray(rawDocuments))
        throw new Error("Search index: invalid data format");

      const docMap = new Map<string, SearchDocument>();
      for (const d of rawDocuments) {
        if (d.id != null && !docMap.has(d.id)) docMap.set(d.id, d);
      }
      const documents = [...docMap.values()];

      const ms = new MiniSearch<SearchDocument>({
        fields: ["title", "description", "context"],
        storeFields: ["id"],
        processTerm: stripDiacritics,
        searchOptions: {
          boost: { title: 4, context: 2 },
          fuzzy: 0.2,
          prefix: true,
          processTerm: stripDiacritics,
        },
      });
      ms.addAll(documents);
      setIndex(ms);
      setDocs(docMap);
    } catch (err) {
      console.error("[search] failed to load index", err);
      loadedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── ⌘K SHORTCUT ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // ─── CLICK OUTSIDE ──────────────────────────────────────
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ─── RESULTS ────────────────────────────────────────────
  const results = useMemo(() => {
    if (!index || !query.trim() || query.trim().length < 2) return [];
    const hits = index.search(query.trim()).slice(0, MAX_RESULTS);
    return hits
      .map((h) => docs.get(h.id as string))
      .filter((d): d is SearchDocument => Boolean(d));
  }, [index, query, docs]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [query]);

  // ─── KEYBOARD NAVIGATION ────────────────────────────────
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) {
        const r = results[activeIdx];
        trackSearchResultClick(query.trim(), r.title, r.type, activeIdx);
        router.push(r.url);
        setIsOpen(false);
        setQuery("");
        onResultClick?.();
      } else if (query.trim()) {
        trackSearch(query.trim(), results.length);
        router.push(`/hledat?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
        onResultClick?.();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>

        <input
          ref={inputRef}
          type="search"
          placeholder="Hledat rappera, album, žánr…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            loadIndex();
            setIsOpen(true);
          }}
          onKeyDown={onInputKey}
          className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-md pl-9 pr-12 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.18] focus:bg-zinc-900 transition-colors"
          aria-label="Hledat na webu"
          aria-expanded={isOpen}
          aria-controls="search-results"
          autoComplete="off"
        />

        <kbd className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-zinc-600 bg-zinc-800/60 border border-zinc-700 rounded px-1.5 py-0.5 items-center pointer-events-none">
          ⌘K
        </kbd>
      </div>

      {/* DROPDOWN */}
      {isOpen && query.length >= 2 && (
        <div
          id="search-results"
          role="listbox"
          className="absolute left-0 right-0 sm:right-auto sm:w-[420px] top-full mt-1 bg-zinc-950 border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden z-50"
        >
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              Načítám index…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              Žádné výsledky pro{" "}
              <span className="text-zinc-300">&ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            <>
              <ul className="max-h-96 overflow-y-auto">
                {results.map((r, idx) => {
                  const isActive = idx === activeIdx;
                  const color = ENTITY_TYPE_COLORS[r.type] ?? "#e4ff1a";
                  return (
                    <li key={r.id}>
                      <Link
                        href={r.url}
                        onClick={() => {
                          trackSearchResultClick(query.trim(), r.title, r.type, idx);
                          setIsOpen(false);
                          setQuery("");
                          onResultClick?.();
                        }}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
                          isActive
                            ? "bg-white/[0.06]"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm mt-0.5 shrink-0"
                          style={{ color, backgroundColor: `${color}15` }}
                        >
                          {ENTITY_TYPE_LABELS[r.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-100 truncate">
                            {r.title}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {r.description}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/hledat?q=${encodeURIComponent(query.trim())}`}
                onClick={() => {
                  trackSearch(query.trim(), results.length);
                  setIsOpen(false);
                  setQuery("");
                  onResultClick?.();
                }}
                className="block border-t border-white/[0.06] px-3 py-2 text-xs font-mono text-zinc-500 hover:text-[#e4ff1a] hover:bg-white/[0.04] transition-colors"
              >
                Zobrazit všechny výsledky pro &ldquo;{query}&rdquo; →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
