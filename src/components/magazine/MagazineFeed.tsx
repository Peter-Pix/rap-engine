'use client'

import { useState, useMemo } from 'react'
import { ArticleCard } from './ArticleCard'
import { FeedFilters, type FilterState } from './FeedFilters'
import { useUnread } from '@/hooks/useUnread'
import type { ArticleListItem } from '@/lib/magazine'

interface MagazineFeedProps {
  articles: ArticleListItem[]
}

export function MagazineFeed({ articles }: MagazineFeedProps) {
  const { isUnread, filterUnread, markRead } = useUnread()
  const [filter, setFilter] = useState<FilterState>({
    unreadOnly: false,
    category: null,
  })

  // Extract existing categories from data
  const existingCategories = useMemo(
    () => [...new Set(articles.map((a) => a.category).filter(Boolean))] as string[],
    [articles],
  )

  // Count of unread articles (= total - read)
  const unreadCount = useMemo(
    () => articles.filter((a) => isUnread(a.slug)).length,
    [articles, isUnread],
  )

  const filtered = useMemo(() => {
    let result = articles

    // Category filter
    if (filter.category) {
      result = result.filter((a) => a.category === filter.category)
    }

    // Unread only — localStorage-backed
    if (filter.unreadOnly) {
      result = filterUnread(result)
    }

    return result
  }, [articles, filter, filterUnread])

  return (
    <div>
      <FeedFilters
        totalCount={articles.length}
        existingCategories={existingCategories}
        unreadCount={unreadCount}
        onChange={setFilter}
      />

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <ArticleCard key={a.slug} article={a} isUnread={isUnread(a.slug)} onRead={markRead} />
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
