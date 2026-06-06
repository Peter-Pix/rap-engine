'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = '4rap-read-articles'

function loadRead(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr: string[] = JSON.parse(raw)
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveRead(set: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // silent — storage full or private mode
  }
}

interface UseUnreadReturn {
  readSlugs: Set<string>
  isUnread: (slug: string) => boolean
  markRead: (slug: string) => void
  markUnread: (slug: string) => void
  toggleRead: (slug: string) => void
  unreadSlugs: (articles: { slug: string }[]) => string[]
  /** Filter unread-only articles from a list */
  filterUnread: <T extends { slug: string }>(items: T[]) => T[]
}

export function useUnread(): UseUnreadReturn {
  const [read, setRead] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRead(loadRead())
  }, [])

  // Article is UNREAD if NOT in the read set (everything new = unread by default)
  const isUnread = useCallback(
    (slug: string) => !read.has(slug),
    [read],
  )

  const markRead = useCallback(
    (slug: string) => {
      setRead((prev) => {
        const next = new Set(prev)
        next.add(slug)
        saveRead(next)
        return next
      })
    },
    [],
  )

  const markUnread = useCallback(
    (slug: string) => {
      setRead((prev) => {
        const next = new Set(prev)
        next.delete(slug)
        saveRead(next)
        return next
      })
    },
    [],
  )

  const toggleRead = useCallback(
    (slug: string) => {
      setRead((prev) => {
        const next = new Set(prev)
        if (next.has(slug)) next.delete(slug)
        else next.add(slug)
        saveRead(next)
        return next
      })
    },
    [],
  )

  const unreadSlugs = useCallback(
    (articles: { slug: string }[]) =>
      articles.filter((a) => !read.has(a.slug)).map((a) => a.slug),
    [read],
  )

  const filterUnread = useCallback(
    <T extends { slug: string }>(items: T[]) =>
      items.filter((item) => !read.has(item.slug)),
    [read],
  )

  return { readSlugs: read, isUnread, markRead, markUnread, toggleRead, unreadSlugs, filterUnread }
}
