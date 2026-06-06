'use client'

// ═══════════════════════════════════════════════════════════════
// FilterableListing — generická client komponenta pro listing pages
//
// Vlastnosti:
// - Vyber filtrovatelné pole (kategoriální nebo numerické) per stránka
// - Auto-extrakce unikátních hodnot z dat
// - Inline search (filtr podle title)
// - Sort: alfabeticky / datum / rok / featured first
// - URL params persistence (?q=...&genre=trap,drill&label=milion-plus)
// - "Clear all" reset
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { EntityCard } from '@/components/entity/EntityCard'
import type { SearchEntityType } from '@/lib/search'

export interface FilterItem {
  slug: string
  title: string
  description: string
  url: string
  meta?: string
  tags?: string[]
  featured?: boolean
  // Filtrovatelné atributy
  genres?: string[]
  label?: string
  year?: number
  rapper?: string
  rapperSlug?: string
  album?: string
  albumSlug?: string
  category?: string
  location?: string
  releaseType?: string
  // Pro sorting
  publishedAt?: string
}

export type FilterFieldConfig =
  | { key: 'genres' | 'label' | 'rapper' | 'album' | 'category' | 'location' | 'releaseType'; label: string; type: 'multi' }
  | { key: 'year'; label: string; type: 'year' }

const VALUE_LABELS: Record<string, Record<string, string>> = {
  releaseType: { album: 'Alba', ep: 'EP', single: 'Single' },
};

export type SortKey = 'alpha' | 'date' | 'year' | 'featured'

interface FilterableListingProps {
  items: FilterItem[]
  itemType: SearchEntityType
  filters?: FilterFieldConfig[]
  defaultSort?: SortKey
  availableSorts?: SortKey[]
  /** Pokud true, ukáže search input nad listingem */
  searchable?: boolean
}

const SORT_LABELS: Record<SortKey, string> = {
  alpha:    'Abecedně',
  date:     'Nejnovější',
  year:     'Nejnovější (rok)',
  featured: 'Doporučené první',
}

function uniqueSorted<T extends string | number>(values: (T | undefined | null)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v !== undefined && v !== null && v !== ''))).sort(
    (a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return b - a
      return String(a).localeCompare(String(b), 'cs')
    },
  )
}

export function FilterableListing({
  items,
  itemType,
  filters = [],
  defaultSort = 'alpha',
  availableSorts = ['alpha'],
  searchable = true,
}: FilterableListingProps) {
  const router = useRouter()
  const params = useSearchParams()

  // ─── INITIAL STATE Z URL ────────────────────────────────
  const [query, setQuery] = useState(params.get('q') || '')
  const [sort, setSort] = useState<SortKey>((params.get('sort') as SortKey) || defaultSort)
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {}
    for (const f of filters) {
      const val = params.get(f.key)
      if (val) init[f.key] = val.split(',').filter(Boolean)
    }
    return init
  })
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // ─── URL SYNC ────────────────────────────────────────────
  useEffect(() => {
    const sp = new URLSearchParams()
    if (query.trim()) sp.set('q', query.trim())
    if (sort !== defaultSort) sp.set('sort', sort)
    for (const [k, vals] of Object.entries(activeFilters)) {
      if (vals.length > 0) sp.set(k, vals.join(','))
    }
    const qs = sp.toString()
    const path = window.location.pathname
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false })
  }, [query, sort, activeFilters, defaultSort, router])

  // ─── DOSTUPNÉ HODNOTY PRO FILTRY ────────────────────────
  const availableValues = useMemo(() => {
    const map: Record<string, (string | number)[]> = {}
    for (const f of filters) {
      if (f.type === 'multi') {
        if (f.key === 'genres') {
          map[f.key] = uniqueSorted(items.flatMap((i) => i.genres || []))
        } else {
          map[f.key] = uniqueSorted(items.map((i) => i[f.key as keyof FilterItem] as string))
        }
      } else if (f.type === 'year') {
        map[f.key] = uniqueSorted(items.map((i) => i.year))
      }
    }
    return map
  }, [items, filters])

  // ─── FILTROVÁNÍ ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = items

    // Filtry
    for (const [key, vals] of Object.entries(activeFilters)) {
      if (vals.length === 0) continue
      if (key === 'genres') {
        result = result.filter((i) => i.genres?.some((g) => vals.includes(g)))
      } else if (key === 'year') {
        const yearStrs = vals
        result = result.filter((i) => i.year && yearStrs.includes(String(i.year)))
      } else {
        result = result.filter((i) => {
          const v = i[key as keyof FilterItem]
          return typeof v === 'string' && vals.includes(v)
        })
      }
    }

    // Search
    const q = query.trim().toLowerCase()
    if (q.length >= 1) {
      const normalize = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const nq = normalize(q)
      result = result.filter(
        (i) =>
          normalize(i.title).includes(nq) ||
          normalize(i.description).includes(nq) ||
          (i.meta && normalize(i.meta).includes(nq)),
      )
    }

    // Sort
    const sorted = [...result]
    if (sort === 'alpha') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'cs'))
    } else if (sort === 'date') {
      sorted.sort(
        (a, b) =>
          new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
      )
    } else if (sort === 'year') {
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0))
    } else if (sort === 'featured') {
      sorted.sort((a, b) => {
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        return a.title.localeCompare(b.title, 'cs')
      })
    }

    return sorted
  }, [items, activeFilters, query, sort])

  // ─── HANDLER FUNKCE ──────────────────────────────────────
  const toggleFilter = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[key] || []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      const out = { ...prev }
      if (next.length === 0) delete out[key]
      else out[key] = next
      return out
    })
  }, [])

  const clearAll = useCallback(() => {
    setQuery('')
    setActiveFilters({})
    setSort(defaultSort)
  }, [defaultSort])

  const totalActive = useMemo(
    () =>
      Object.values(activeFilters).reduce((sum, v) => sum + v.length, 0) +
      (query.trim() ? 1 : 0) +
      (sort !== defaultSort ? 1 : 0),
    [activeFilters, query, sort, defaultSort],
  )

  // ─── CLICK OUTSIDE PRO DROPDOWNS ────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-filter-dropdown]')) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div>
      {/* ─── TOOLBAR ─── */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Search input */}
        {searchable && (
          <div className="relative max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500"
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
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat v této kategorii…"
              className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-md pl-9 pr-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.18] focus:bg-zinc-900 transition-colors"
            />
          </div>
        )}

        {/* Filter dropdowns row */}
        {(filters.length > 0 || availableSorts.length > 1 || totalActive > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => {
              const vals = availableValues[f.key] || []
              if (vals.length === 0) return null
              const selected = activeFilters[f.key] || []
              const isOpen = openDropdown === f.key

              return (
                <div key={f.key} className="relative" data-filter-dropdown>
                  <button
                    onClick={() => setOpenDropdown((d) => (d === f.key ? null : f.key))}
                    className={`flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border transition-colors ${
                      selected.length > 0
                        ? 'bg-[#e4ff1a]/10 border-[#e4ff1a]/30 text-[#e4ff1a]'
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200'
                    }`}
                  >
                    {f.label}
                    {selected.length > 0 && (
                      <span className="bg-[#e4ff1a]/20 text-[#e4ff1a] rounded px-1.5 text-[10px]">
                        {selected.length}
                      </span>
                    )}
                    <svg
                      className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="absolute top-full left-0 mt-1 min-w-48 max-h-72 overflow-y-auto bg-zinc-950 border border-white/[0.1] rounded-lg shadow-2xl z-30 py-1">
                      {vals.map((v) => {
                        const isSelected = selected.includes(String(v))
                        return (
                          <button
                            key={String(v)}
                            onClick={() => toggleFilter(f.key, String(v))}
                            className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                              isSelected ? 'text-[#e4ff1a]' : 'text-zinc-300 hover:bg-white/[0.04]'
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-[#e4ff1a] border-[#e4ff1a]'
                                  : 'border-zinc-700'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-2.5 h-2.5 text-zinc-950"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </span>
                            <span className="flex-1 truncate">{VALUE_LABELS[f.key]?.[String(v)] || String(v)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Sort dropdown */}
            {availableSorts.length > 1 && (
              <div className="relative" data-filter-dropdown>
                <button
                  onClick={() => setOpenDropdown((d) => (d === '__sort' ? null : '__sort'))}
                  className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 transition-colors"
                >
                  Řadit: <span className="text-zinc-200">{SORT_LABELS[sort]}</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${
                      openDropdown === '__sort' ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === '__sort' && (
                  <div className="absolute top-full left-0 mt-1 min-w-44 bg-zinc-950 border border-white/[0.1] rounded-lg shadow-2xl z-30 py-1">
                    {availableSorts.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSort(s)
                          setOpenDropdown(null)
                        }}
                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                          sort === s ? 'text-[#e4ff1a]' : 'text-zinc-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        {SORT_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clear button */}
            {totalActive > 0 && (
              <button
                onClick={clearAll}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-200 underline underline-offset-2 transition-colors ml-1"
              >
                Vymazat ({totalActive})
              </button>
            )}
          </div>
        )}

        {/* Result count */}
        <div className="text-xs font-mono text-zinc-600">
          {filtered.length === items.length
            ? `${items.length} celkem`
            : `${filtered.length} z ${items.length}`}
        </div>
      </div>

      {/* ─── RESULTS ─── */}
      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-zinc-400 text-sm mb-2">
            Žádné výsledky s aktuálními filtry.
          </p>
          <button
            onClick={clearAll}
            className="text-xs font-mono text-[#e4ff1a] hover:text-white"
          >
            Vymazat filtry →
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <EntityCard
              key={item.slug}
              title={item.title}
              description={item.description}
              href={item.url}
              type={itemType}
              meta={item.meta}
              tags={item.tags}
              featured={item.featured}
            />
          ))}
        </div>
      )}
    </div>
  )
}
