'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArticleCard } from './ArticleCard'
import { useUnread } from '@/hooks/useUnread'
import type { ArticleListItem } from '@/lib/magazine'

// ═══════════════════════════════════════════════════════════════
// UnreadFeed — homepage feed s automatickým otáčením
//
// Chování:
//   ● Všechny články se jednou zamíchají (na straně klienta)
//   ● Feed zobrazí max 6 — prioritně nepřečtené
//   ● Kliknutí na článek → markRead → pokud je v zásobě další
//     nepřečtený, nahradí ho → feed se plynule obnovuje
//   ● Když jsou všechny přečtené, feed ukáže posledních 6
// ═══════════════════════════════════════════════════════════════

export function UnreadFeed({ articles }: { articles: ArticleListItem[] }) {
  const { isUnread, markRead } = useUnread()
  const [shuffled, setShuffled] = useState<ArticleListItem[]>([])
  const [visible, setVisible] = useState<ArticleListItem[]>([])

  // Jednorázové zamíchání všech článků při mountu
  useEffect(() => {
    const s = [...articles].sort(() => Math.random() - 0.5)
    setShuffled(s)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pokaždé, když se změní read stav, překalkulujeme viditelných 6
  useEffect(() => {
    if (shuffled.length === 0) return

    // Rozdělíme na nepřečtené a přečtené
    const unread: ArticleListItem[] = []
    const read: ArticleListItem[] = []

    for (const a of shuffled) {
      if (isUnread(a.slug)) {
        unread.push(a)
      } else {
        read.push(a)
      }
    }

    // Vezmeme max 6 — nepřečtené first
    const batch = [...unread, ...read].slice(0, 6)
    setVisible(batch)
  }, [shuffled, isUnread])

  const handleRead = useCallback(
    (slug: string) => {
      markRead(slug)
    },
    [markRead],
  )

  if (visible.length === 0) return null

  const unreadCount = articles.filter((a) => isUnread(a.slug)).length

  return (
    <div>
      {/* Feed header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
            FEED
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md bg-white/[0.04] ring-1 ring-white/5 text-zinc-400">
            {articles.length} článků
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/70">
              {unreadCount} nepřečtených
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-zinc-600 hidden sm:block">
          Čtením se feed obnovuje
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((a) => (
          <ArticleCard
            key={a.slug}
            article={a}
            isUnread={isUnread(a.slug)}
            onRead={handleRead}
          />
        ))}
      </div>

      {/* All read state */}
      {unreadCount === 0 && (
        <p className="mt-4 text-center text-xs font-mono text-zinc-600">
          ✨ Všechny články přečtené. Až přibude nový, objeví se tady.
        </p>
      )}
    </div>
  )
}