"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

interface Entity {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string;
  outbound?: Record<string, string[]>;
  inbound?: Record<string, string[]>;
  rapperCount?: number;
  hasImage?: boolean;
}

interface FilterOption {
  id: string;
  title: string;
}

interface FilterState {
  genres: string[];
  labels: string[];
  locations: string[];
  scenes: string[];
  styles: string[];
  moods: string[];
}

interface EntityListingClientProps {
  title: string;
  description: string;
  entities: Entity[];
  filters: {
    genres: FilterOption[];
    labels: FilterOption[];
    locations: FilterOption[];
    scenes: FilterOption[];
    styles: FilterOption[];
    moods: FilterOption[];
  };
}

export default function EntityListingClient({
  title,
  description,
  entities,
  filters,
}: EntityListingClientProps) {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    genres: [],
    labels: [],
    locations: [],
    scenes: [],
    styles: [],
    moods: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  // Top 100 by default for artist/track listings
  const type = entities[0]?.type;
  const supportsTopLimit = type === "artist" || type === "track";
  const [showAll, setShowAll] = useState(!supportsTopLimit);

  // Memo: active filter count (used in filtered deps)
  const activeCount = Object.values(activeFilters).flat().length;

  // Compute edge counts (inbound + outbound) for ranking
  const edgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entities) {
      const ob = e.outbound || {};
      const ib = e.inbound || {};
      let count = 0;
      for (const arr of Object.values(ob)) {
        count += arr.length;
      }
      for (const arr of Object.values(ib)) {
        count += arr.length;
      }
      counts[e.id] = count;
    }
    return counts;
  }, [entities]);

  const filtered = useMemo(() => {
    let results = [...entities];

    // Top 100 by edge count (default for artist/track listings)
    if (supportsTopLimit && !showAll && !search.trim() && activeCount === 0) {
      results = [...results]
        .sort((a, b) => (edgeCounts[b.id] || 0) - (edgeCounts[a.id] || 0))
        .slice(0, 100);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }

    // Filters
    const anyFilterActive = Object.values(activeFilters).some(
      (arr) => arr.length > 0
    );
    if (anyFilterActive) {
      results = results.filter((e) => {
        const ob = e.outbound || {};
        const entityIds = new Set([
          ...(ob.HAS_GENRE || []),
          ...(ob.SIGNED_TO || []),
          ...(ob.ORIGINATES_FROM || []),
          ...(ob.BELONGS_TO_SCENE || []),
          ...(ob.HAS_STYLE || []),
          ...(ob.HAS_MOOD || []),
        ]);

        // Must match ALL active filters (AND logic)
        if (activeFilters.genres.length > 0) {
          const hasGenre = activeFilters.genres.some((id) => entityIds.has(id));
          if (!hasGenre) return false;
        }
        if (activeFilters.labels.length > 0) {
          const hasLabel = activeFilters.labels.some((id) => entityIds.has(id));
          if (!hasLabel) return false;
        }
        if (activeFilters.locations.length > 0) {
          const hasLoc = activeFilters.locations.some((id) => entityIds.has(id));
          if (!hasLoc) return false;
        }
        if (activeFilters.scenes.length > 0) {
          const hasScene = activeFilters.scenes.some((id) => entityIds.has(id));
          if (!hasScene) return false;
        }
        if (activeFilters.styles.length > 0) {
          const hasStyle = activeFilters.styles.some((id) => entityIds.has(id));
          if (!hasStyle) return false;
        }
        if (activeFilters.moods.length > 0) {
          const hasMood = activeFilters.moods.some((id) => entityIds.has(id));
          if (!hasMood) return false;
        }
        return true;
      });
    }

    // Sort: artists with images first, then by edge count, then alphabetically
    return results.sort((a, b) => {
      // Artists with images first
      if (a.hasImage && !b.hasImage) return -1;
      if (!a.hasImage && b.hasImage) return 1;
      // Then by edge count (descending)
      const edgeDiff = (edgeCounts[b.id] || 0) - (edgeCounts[a.id] || 0);
      if (edgeDiff !== 0) return edgeDiff;
      // Then alphabetically
      return a.title.localeCompare(b.title);
    });
  }, [entities, search, activeFilters, showAll, supportsTopLimit, edgeCounts, activeCount]);

  const toggleFilter = (category: keyof FilterState, id: string) => {
    setActiveFilters((prev) => {
      const current = prev[category];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...prev, [category]: next };
    });
  };

  const clearFilters = () =>
    setActiveFilters({ genres: [], labels: [], locations: [], scenes: [], styles: [], moods: [] });

  const getRoute = (e: Entity) => {
    const prefix = TYPE_ROUTE_MAP[e.type as EntityType] ?? `/${e.type}`;
    return `${prefix}/${e.slug}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-3">
          {title}
        </h1>
        <p className="text-zinc-400 text-sm">{description}</p>
        {supportsTopLimit && !showAll && (
          <p className="mt-2 text-xs text-zinc-600">
            Zobrazeno top 100 nejpropojenějších. Pro kompletní seznam klikni na „Všichni”.
          </p>
        )}
      </div>

      {/* Search + Filter toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Hledat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtry {activeCount > 0 && (
            <span className="bg-[#e4ff1a] text-zinc-900 text-xs font-bold rounded-full px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 rounded-lg text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
          >
            Zrušit filtry
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-xl border border-white/[0.08] bg-zinc-900/50 space-y-4">
          <FilterGroup
            label="Žánry"
            options={filters.genres}
            active={activeFilters.genres}
            onToggle={(id) => toggleFilter("genres", id)}
          />
          <FilterGroup
            label="Styly"
            options={filters.styles}
            active={activeFilters.styles}
            onToggle={(id) => toggleFilter("styles", id)}
          />
          <FilterGroup
            label="Nálady"
            options={filters.moods}
            active={activeFilters.moods}
            onToggle={(id) => toggleFilter("moods", id)}
          />
          <FilterGroup
            label="Labely"
            options={filters.labels}
            active={activeFilters.labels}
            onToggle={(id) => toggleFilter("labels", id)}
          />
          <FilterGroup
            label="Lokality"
            options={filters.locations}
            active={activeFilters.locations}
            onToggle={(id) => toggleFilter("locations", id)}
          />
          <FilterGroup
            label="Scény"
            options={filters.scenes}
            active={activeFilters.scenes}
            onToggle={(id) => toggleFilter("scenes", id)}
          />
        </div>
      )}

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {filtered.length} {filtered.length === 1 ? "výsledek" : filtered.length < 5 ? "výsledky" : "výsledků"}
          {supportsTopLimit && !showAll && activeCount === 0 && !search.trim() && filtered.length >= 100 && (
            <span className="text-zinc-600"> · top 100</span>
          )}
        </p>
        {supportsTopLimit && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border border-zinc-800 hover:border-[#c8962e] hover:text-[#c8962e] transition-colors"
          >
            {showAll ? `Top 100` : `Všichni (${entities.length})`}
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((entity) => (
            <Link
              key={entity.id}
              href={getRoute(entity)}
              className="block group"
            >
              <div className="glass glass-hover rounded-xl p-5 transition-all duration-200 group-hover:translate-y-[-1px] h-full flex flex-col">
                {entity.hasImage && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mb-3 ring-2 ring-white/[0.06] group-hover:ring-[#c8962e]/30 transition-all shrink-0">
                    <img
                      src={`/images/artists/${entity.slug}.webp`}
                      alt={entity.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-bold text-zinc-100 group-hover:text-white transition-colors leading-snug">
                    {entity.title}
                  </h2>
                  {entity.rapperCount !== undefined && entity.rapperCount > 0 && (
                    <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded shrink-0">
                      {entity.rapperCount}×
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500 line-clamp-2 flex-1">
                  {entity.description}
                </p>
                {entity.outbound?.HAS_GENRE && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {Array.from(new Set(entity.outbound.HAS_GENRE)).slice(0, 3).map((genreId) => (
                      <span
                        key={genreId}
                        className="text-[9px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded-sm"
                      >
                        {genreId.replace("genre_", "")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg mb-2">Žádné výsledky</p>
          <p className="text-zinc-600 text-sm">Zkus změnit hledání nebo filtry</p>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: FilterOption[];
  active: string[];
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-2">
        {label}
      </h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = active.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                isActive
                  ? "bg-[#e4ff1a] text-zinc-900 font-bold"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
              }`}
            >
              {opt.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
