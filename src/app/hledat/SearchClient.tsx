"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import Fuse from "fuse.js";

interface SearchEntry {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string;
  context: string;
}

interface SearchClientProps {
  entries: SearchEntry[];
}

const TYPE_LABELS: Record<string, string> = {
  artist: "Umělec",
  album: "Album",
  track: "Skladba",
  genre: "Žánr",
  style: "Styl",
  theme: "Téma",
  mood: "Nálada",
  scene: "Scéna",
  label: "Label",
  location: "Lokalita",
  article: "Článek",
  collective: "Kolektiv",
  producer: "Producent",
  event: "Akce",
};

const TYPE_ROUTE: Record<string, string> = {
  artist: "raperi",
  album: "alba",
  track: "skladby",
  genre: "zanry",
  style: "styly",
  theme: "temata",
  mood: "nalady",
  scene: "sceny",
  label: "labely",
  location: "lokality",
  article: "clanky",
  collective: "kolektivy",
  producer: "producenti",
  event: "akce",
};

export default function SearchClient({ entries }: SearchClientProps) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);

  const fuse = useMemo(() => {
    if (entries.length === 0) return null;
    return new Fuse(entries, {
      keys: [
        { name: "title", weight: 0.5 },
        { name: "description", weight: 0.3 },
        { name: "context", weight: 0.15 },
        { name: "type", weight: 0.05 },
      ],
      threshold: 0.35,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
    });
  }, [entries]);

  const results = useMemo(() => {
    if (!fuse || !query.trim() || query.trim().length < 2) return [];
    const raw = fuse.search(query.trim());
    let items = raw.map((r) => ({ ...r.item, score: r.score ?? 1 }));
    if (activeType) {
      items = items.filter((i) => i.type === activeType);
    }
    return items.slice(0, 50);
  }, [fuse, query, activeType]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [results]);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.type));
    return Array.from(set).sort();
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Hledat umělce, alba, žánry, lokality..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10"
          autoFocus
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Type filters */}
      {query.trim().length >= 2 && results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType(null)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              activeType === null
                ? "bg-[#e4ff1a] text-zinc-900 font-bold"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Vše ({results.length})
          </button>
          {allTypes.map((t) => {
            const count = typeCounts[t] || 0;
            if (count === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setActiveType(activeType === t ? null : t)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                  activeType === t
                    ? "bg-[#e4ff1a] text-zinc-900 font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {TYPE_LABELS[t] || t} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {query.trim().length >= 2 && (
        <div className="space-y-4">
          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((entry) => (
                <ResultCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-zinc-500 text-lg mb-2">Žádné výsledky</p>
              <p className="text-zinc-600 text-sm">Zkus jiný dotaz</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {query.trim().length === 0 && (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg mb-2">Začni psát pro vyhledávání</p>
          <p className="text-zinc-600 text-sm">Hledej umělce, alba, žánry, lokality, scény...</p>
        </div>
      )}
    </div>
  );
}

function ResultCard({ entry }: { entry: SearchEntry }) {
  const routePrefix = TYPE_ROUTE[entry.type] || entry.type + "s";
  const typeLabel = TYPE_LABELS[entry.type] || entry.type;

  return (
    <Link href={`/${routePrefix}/${entry.slug}`} className="block group">
      <div className="glass glass-hover rounded-xl p-5 transition-all duration-200 group-hover:translate-y-[-1px] h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#e4ff1a] bg-[#e4ff1a]/10 px-1.5 py-0.5 rounded-sm">
            {typeLabel}
          </span>
        </div>
        <h3 className="font-bold text-zinc-100 group-hover:text-white transition-colors mb-2 leading-snug">
          {entry.title}
        </h3>
        <p className="text-sm text-zinc-500 line-clamp-2 flex-1">
          {entry.description}
        </p>
        {entry.context && (
          <p className="text-xs text-zinc-600 mt-2 line-clamp-1 italic">
            {entry.context}
          </p>
        )}
      </div>
    </Link>
  );
}
