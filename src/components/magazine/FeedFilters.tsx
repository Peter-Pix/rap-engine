'use client'

import { useState } from 'react'

// ═══════════════════════════════════════════════════════════════
// FeedFilters — řádek nad grid: "FEED  N článků  ●NEPŘEČTENÉ  ↻NÁHODNÉ  ≡FILTR"
//
// MVP: unread toggle, random toggle a filter dropdown jsou client-side přepínače.
// Reálnou logiku zapojíš až později (localStorage reading state,
// URLSearchParams pro category/tag filter).
// ═══════════════════════════════════════════════════════════════

interface FeedFiltersProps {
  totalCount: number
  /** Volání s aktuálním stavem filtrů. Page si vybere co s tím. */
  onChange?: (state: FilterState) => void
}

export interface FilterState {
  unreadOnly: boolean
  randomOrder: boolean
  category: string | null
}

export function FeedFilters({ totalCount, onChange }: FeedFiltersProps) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [randomOrder, setRandomOrder] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const update = (next: Partial<FilterState>) => {
    const nextState: FilterState = {
      unreadOnly: next.unreadOnly !== undefined ? next.unreadOnly : unreadOnly,
      randomOrder: next.randomOrder !== undefined ? next.randomOrder : randomOrder,
      category: next.category !== undefined ? next.category : category,
    }
    if (next.unreadOnly !== undefined) setUnreadOnly(nextState.unreadOnly)
    if (next.randomOrder !== undefined) setRandomOrder(nextState.randomOrder)
    if (next.category !== undefined) setCategory(nextState.category)
    onChange?.(nextState)
  }

  return (
    <div className="flex items-center justify-between mb-6 gap-4">
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
        {/* Unread toggle */}
        <button
          type="button"
          onClick={() => update({ unreadOnly: !unreadOnly })}
          aria-pressed={unreadOnly}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full ring-1 transition-colors',
            unreadOnly
              ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40'
              : 'bg-white/[0.04] text-zinc-400 ring-white/10 hover:text-zinc-200 hover:ring-white/20',
          ].join(' ')}
        >
          <span className={['w-1.5 h-1.5 rounded-full', unreadOnly ? 'bg-emerald-400' : 'bg-zinc-500'].join(' ')} aria-hidden />
          Nepřečtené
        </button>

        {/* Random toggle */}
        <button
          type="button"
          onClick={() => update({ randomOrder: !randomOrder })}
          aria-pressed={randomOrder}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full ring-1 transition-colors',
            randomOrder
              ? 'bg-amber-500/20 text-amber-300 ring-amber-500/40'
              : 'bg-white/[0.04] text-zinc-400 ring-white/10 hover:text-zinc-200 hover:ring-white/20',
          ].join(' ')}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Náhodné
        </button>

        {/* Category filter dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full bg-white/[0.04] text-zinc-400 ring-1 ring-white/10 hover:text-zinc-200 hover:ring-white/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filtr
            <svg className={['w-3 h-3 transition-transform', filterOpen ? 'rotate-180' : ''].join(' ')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
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
              {(['raperi', 'alba', 'labely', 'zanry', 'clanky', 'navody', 'recenze', 'rozhovor', 'historie'] as const).map((c) => (
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
      </div>
    </div>
  )
}
