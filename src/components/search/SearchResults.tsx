'use client'

// ═══════════════════════════════════════════════════════════════
// SearchResults — full results komponenta pro /hledej?q=...
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import MiniSearch from 'minisearch'
import { EntityCard } from '@/components/entity/EntityCard'
import { ENTITY_TYPE_LABELS } from '@/lib/search'
import type { SearchDocument, SearchEntityType } from '@/lib/search'

const ENTITY_TYPES: SearchEntityType[] = ['rapper', 'album', 'label', 'zanr', 'skladba', 'clanek']

export function SearchResults() {
  const router = useRouter()
  const params = useSearchParams()
  const initialQuery = params.get('q') || ''
  const initialType = (params.get('type') as SearchEntityType | null) || null

  const [query, setQuery] = useState(initialQuery)
  const [typeFilter, setTypeFilter] = useState<SearchEntityType | null>(initialType)
  const [index, setIndex] = useState<MiniSearch<SearchDocument> | null>(null)
  const [docs, setDocs] = useState<Map<string, SearchDocument>>(new Map())
  const [loading, setLoading] = useState(true)

  // ─── LOAD INDEX ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/search-index')
        if (!res.ok) throw new Error(`Search index fetch failed: ${res.status}`)
        const raw = await res.json()
        if (cancelled) return

        // API vrací ploché pole, ne objekt s .documents (BUG-01 fix)
        const rawDocuments: SearchDocument[] = Array.isArray(raw) ? raw : raw.documents ?? []

        // Deduplikace podle id — MiniSearch.addAll() hází na duplicitách
        const docMap = new Map<string, SearchDocument>()
        for (const d of rawDocuments) {
          if (d.id != null && !docMap.has(d.id)) docMap.set(d.id, d)
        }
        const documents = [...docMap.values()]

        const stripDiacritics = (term: string): string =>
          term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

        const ms = new MiniSearch<SearchDocument>({
          fields: ['title', 'description', 'context'],
          storeFields: ['id'],
          processTerm: stripDiacritics,
          searchOptions: {
            boost: { title: 4, context: 2 },
            fuzzy: 0.2,
            prefix: true,
            processTerm: stripDiacritics, // BUG-02 fix: query term diacritics folding
          },
        })
        ms.addAll(documents)
        if (!cancelled) {
          setIndex(ms)
          setDocs(docMap)
          setLoading(false)
        }
      } catch (err) {
        console.error('[search] failed', err)
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ─── SYNC URL ───────────────────────────────────────────
  useEffect(() => {
    const sp = new URLSearchParams()
    if (query.trim()) sp.set('q', query.trim())
    if (typeFilter) sp.set('type', typeFilter)
    const qs = sp.toString()
    router.replace(qs ? `/hledej?${qs}` : '/hledej', { scroll: false })
  }, [query, typeFilter, router])

  // ─── RESULTS ────────────────────────────────────────────
  const results = useMemo(() => {
    if (!index || !query.trim() || query.trim().length < 2) return []
    return index
      .search(query.trim())
      .map((h) => docs.get(h.id as string))
      .filter((d): d is SearchDocument => Boolean(d))
  }, [index, query, docs])

  const filtered = useMemo(
    () => (typeFilter ? results.filter((r) => r.type === typeFilter) : results),
    [results, typeFilter],
  )

  const counts = useMemo(() => {
    const map: Record<SearchEntityType, number> = {
      rapper: 0, album: 0, label: 0, zanr: 0, skladba: 0, clanek: 0,
    }
    for (const r of results) map[r.type]++
    return map
  }, [results])

  return (
    <div>
      {/* Search input */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
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
            placeholder="Hledat napříč všemi entitami…"
            className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-lg pl-12 pr-4 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.18] focus:bg-zinc-900 transition-colors"
            autoFocus
          />
        </div>
      </div>

      {/* Type filter tabs */}
      {query.trim().length >= 2 && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-white/[0.05]">
          <button
            onClick={() => setTypeFilter(null)}
            className={`text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors ${
              typeFilter === null
                ? 'bg-[#e4ff1a] text-zinc-950'
                : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]'
            }`}
          >
            Vše ({results.length})
          </button>
          {ENTITY_TYPES.filter((t) => counts[t] > 0).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === t
                  ? 'bg-zinc-200 text-zinc-950'
                  : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]'
              }`}
            >
              {ENTITY_TYPE_LABELS[t]} ({counts[t]})
            </button>
          ))}
        </div>
      )}

      {/* Stav */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500">Načítám index…</div>
      ) : !query.trim() ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          Začni psát pro vyhledávání napříč databází.
        </div>
      ) : query.trim().length < 2 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          Zadej alespoň 2 znaky.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-zinc-400 text-sm mb-2">
            Žádné výsledky pro <span className="text-zinc-200">&ldquo;{query}&rdquo;</span>
          </div>
          <div className="text-xs text-zinc-600">
            Zkus zkrátit dotaz, jinou diakritiku nebo synonyma.
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <EntityCard
              key={r.id}
              title={r.title}
              description={r.description}
              href={r.url}
              type={r.type}
              meta={r.context}
            />
          ))}
        </div>
      )}
    </div>
  )
}
