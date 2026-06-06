'use client'

import { useState, useEffect, useMemo } from 'react'
import { ARTICLE_CATEGORIES } from './CategoryBadge'

// ═══════════════════════════════════════════════════════════════
// FeedFilters — filtr nad feedem článků
//
// Aktivní funkce:
//   ● Nepřečtené  — zobrazí jen články, které nejsou v localStorage
//                    "přečtené". Tlačítko zmizí, když je vše přečteno.
//   ≡ Kategorie  — dropdown filtr podle kategorie článku.
//                    Zobrazí jen kategorie, které reálně existují.
//
// Zrušeno: "Náhodné" bylo placebo, nahrazeno deterministickým
// denním výběrem na serveru (daily-pick.ts).
// ═══════════════════════════════════════════════════════════════

interface FeedFiltersProps {
  totalCount: number
  existingCategories: string[]
  unreadCount: number
  showUnread?: boolean
  /** Volání s aktuálním stavem filtrů. Page si vybere co s tím. */
  onChange?: (state: FilterState) => void
}

export interface FilterState {
  unreadOnly: boolean
  category: string | null
}

export function FeedFilters({
  totalCount,
  existingCategories,
  unreadCount,
  showUnread = true,
  onChange,
}: FeedFiltersProps) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  // Only categories that exist and are in ARTICLE_CATEGORIES
  const availableCategories = useMemo(() => {
    const allowed = new Set(ARTICLE_CATEGORIES)
    return existingCategories.filter((c) => allowed.has(c as typeof ARTICLE_CATEGORIES[number]))
  }, [existingCategories])

  // Reset unreadOnly when all articles are read
  useEffect(() => {
    if (unreadCount === 0 && unreadOnly) {
      setUnreadOnly(false)
      onChange?.({ unreadOnly: false, category })
    }
  }, [unreadCount, unreadOnly, category, onChange])

  const update = (next: Partial<FilterState>) => {
    const nextState: FilterState = {
      unreadOnly: next.unreadOnly !== undefined ? next.unreadOnly : unreadOnly,
      category: next.category !== undefined ? next.category : category,
    }
    if (next.unreadOnly !== undefined) setUnreadOnly(nextState.unreadOnly)
    if (next.category !== undefined) setCategory(nextState.category)
    onChange?.(nextState)
  }

  return (
    <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
      {/* Left: FEED label + count */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
          FEED
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md bg-white/[0.04] ring-1 ring-white/5 text-zinc-400">
          {totalCount} článk{totalCount === 1 ? '' : 'ů'}
        </span>
      </div>

      {/* Right: filters */}
      <div className="flex items-center gap-2">
        {/* Unread toggle — hidden when nothing is unread */}
        {showUnread && unreadCount > 0 && (
          <button
            type="button"
            onClick={() => update({ unreadOnly: !unreadOnly })}
            aria-pressed={unreadOnly}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full ring-1 transition-colors',
              unreadOnly
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                : 'bg-white/[0.04] text-zinc-400 ring-white/10 hover:text-zinc-200 hover:ring-white/20',
            ].join(' ')}
          >
            <span
              className={['w-1.5 h-1.5 rounded-full', unreadOnly ? 'bg-emerald-400' : 'bg-zinc-500'].join(' ')}
              aria-hidden
            />
            Nepřečtené ({unreadCount})
          </button>
        )}

        {/* Category filter dropdown — only shown when there are categories */}
        {availableCategories.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className={[
                'inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full ring-1 transition-colors',
                filterOpen || category
                  ? 'bg-white/[0.08] text-zinc-200 ring-white/20'
                  : 'bg-white/[0.04] text-zinc-400 ring-white/10 hover:text-zinc-200 hover:ring-white/20',
              ].join(' ')}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {category || 'Filtr'}
              <svg
                className={['w-3 h-3 transition-transform', filterOpen ? 'rotate-180' : ''].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-zinc-900 ring-1 ring-white/10 shadow-2xl shadow-black/50 p-2 z-20">
                <button
                  type="button"
                  onClick={() => { update({ category: null }); setFilterOpen(false) }}
                  className={[
                    'w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-widest rounded-md transition-colors',
                    category === null ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                  ].join(' ')}
                >
                  Všechny kategorie
                </button>
                {availableCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { update({ category: c }); setFilterOpen(false) }}
                    className={[
                      'w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-widest rounded-md transition-colors',
                      category === c ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                    ].join(' ')}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
