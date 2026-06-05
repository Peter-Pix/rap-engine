'use client'

// ═══════════════════════════════════════════════════════════════
// MagazineFeed — client wrapper pro homepage feed s filtry
//
// Přebírá pole článků ze serveru a zapojuje FeedFilters onChange
// callback pro reálné filtrování na klientovi.
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { ArticleCard } from './ArticleCard'
import { FeedFilters, type FilterState } from './FeedFilters'
import type { ArticleListItem } from '@/lib/magazine'

interface MagazineFeedProps {
  articles: ArticleListItem[]
}

export function MagazineFeed({ articles }: MagazineFeedProps) {
  const [filter, setFilter] = useState<FilterState>({
    unreadOnly: false,
    randomOrder: false,
    category: null,
  })

  const filtered = useMemo(() => {
    let result = articles

    // Category filter
    if (filter.category) {
      result = result.filter((a) => a.category === filter.category)
    }

    // Unread only (MVP: placeholder — reálná logika přijde s localStorage reading history)
    // Prozatím jen předáno do onChange, bez efektu na data

    // Random order
    if (filter.randomOrder) {
      result = [...result].sort(() => Math.random() - 0.5)
    }

    return result
  }, [articles, filter])

  return (
    <div>
      <FeedFilters totalCount={articles.length} onChange={setFilter} />

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06] p-12 text-center">
          <p className="text-zinc-500 text-sm">Žádné články neodpovídají filtru.</p>
        </div>
      )}
    </div>
  )
}
