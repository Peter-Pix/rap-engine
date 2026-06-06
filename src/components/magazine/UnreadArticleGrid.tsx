'use client'

import { useUnread } from '@/hooks/useUnread'
import { ArticleCard } from '@/components/magazine/ArticleCard'
import type { ArticleListItem } from '@/lib/magazine'

export function UnreadArticleGrid({ articles }: { articles: ArticleListItem[] }) {
  const { isUnread } = useUnread()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {articles.map((a) => (
        <ArticleCard key={a.slug} article={a} isUnread={isUnread(a.slug)} />
      ))}
    </div>
  )
}