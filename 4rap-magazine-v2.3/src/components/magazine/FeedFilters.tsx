'use client'

import { useState } from 'react'

// ═══════════════════════════════════════════════════════════════
// FeedFilters v2.3 — mobile layout fix
//
// FIX v2.3:
//   • "FEED" slovo schované na mobile (hidden sm:inline)
//   • Smaller paddings na mobile pillula (px-2.5 místo px-3)
//   • Gap zhustlý (gap-1 sm:gap-2)
//   • Layout: count vlevo, akce vpravo — vejde se i na 360px
//
// Layout mobile:
//   [27 článků]            [● nepřečtené]  [≡ filtr]
//
// Layout desktop:
//   FEED  [27 článků]      [● nepřečtené]  [≡ filtr ▾]
// ═══════════════════════════════════════════════════════════════

interface FeedFiltersProps {
  totalCount: number
  onChange?: (state: FilterState) => void
}

export interface FilterState {
  unreadOnly: boolean
  category: string | null
}

export function FeedFilters({ totalCount, onChange }: FeedFiltersProps) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const update = (next: Partial<FilterState>) => {
    const nextState = {
      unreadOnly: next.unreadOnly ?? unreadOnly,
      category: next.category !== undefined ? next.category : category,
    }
    if (next.unreadOnly !== undefined) setUnreadOnly(nextState.unreadOnly)
    if (next.category !== undefined) setCategory(nextState.category)
    onChange?.(nextState)
  }

  return (
    <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
      {/* Left: FEED (jen desktop) + count */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="hidden sm:inline text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
          FEED
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md bg-white/[0.04] ring-1 ring-white/5 text-zinc-400 shrink-0">
          {totalCount} článk{totalCount === 1 ? '' : 'ů'}
        </span>
      </div>

      {/* Right: filters */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => update({ unreadOnly: !unreadOnly })}
          aria-pressed={unreadOnly}
          className={[
            'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full ring-1 transition-colors',
            unreadOnly
              ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40'
              : 'bg-white/[0.04] text-zinc-400 ring-white/10 hover:text-zinc-200 hover:ring-white/20',
          ].join(' ')}
        >
          <span className={['w-1.5 h-1.5 rounded-full', unreadOnly ? 'bg-emerald-400' : 'bg-zinc-500'].join(' ')} aria-hidden />
          <span className="hidden xs:inline sm:inline">Nepřečtené</span>
          <span className="xs:hidden sm:hidden">Nepř.</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full bg-white/[0.04] text-zinc-400 ring-1 ring-white/10 hover:text-zinc-200 hover:ring-white/20 transition-colors"
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
