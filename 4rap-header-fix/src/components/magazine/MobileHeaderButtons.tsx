'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileMenu } from '@/components/shared/MobileMenu'

// ═══════════════════════════════════════════════════════════════
// MobileHeaderButtons — IZOLOVANÝ client component
//
// Veškerá mobilní interaktivita žije tady, odděleně od headeru.
// Důvod: MagazineHeader je importovaný z layout.tsx (Server Component).
// Když je state management míchán s SSR kontextem, React může
// selhat při hydrataci a onClick handlery se nepřipojí.
//
// Oddělením do leaf client component to přestane být problém.
// Tato komponenta je čistě client-side, žádný SSR.
// ═══════════════════════════════════════════════════════════════

interface MobileHeaderButtonsProps {
  unreadCount?: number
}

export function MobileHeaderButtons({ unreadCount }: MobileHeaderButtonsProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Esc zavře search
  useEffect(() => {
    if (!searchOpen) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [searchOpen])

  // Body scroll lock při otevřeném menu
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearchOpen(false)
    setQuery('')
    router.push(`/hledej?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      {/* === MOBILE BUTTONS v hlavičce === */}
      <div className="flex items-center gap-1 md:hidden shrink-0">

        {/* Unread badge */}
        {typeof unreadCount === 'number' && unreadCount > 0 && (
          <a
            href="/?filter=unread"
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
            aria-label={`${unreadCount} novinek`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </a>
        )}

        {/* Search button */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Hledat"
          style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          className="inline-flex items-center justify-center w-10 h-10 text-zinc-300"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
          </svg>
        </button>

        {/* Hamburger button */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Otevřít menu"
          style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          className="inline-flex items-center justify-center w-10 h-10 text-zinc-300 -mr-1"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* === MOBILE MENU DRAWER === */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* === MOBILE SEARCH OVERLAY === */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[65] md:hidden flex flex-col"
          style={{ backgroundColor: 'rgba(9, 9, 11, 0.97)', backdropFilter: 'blur(12px)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Hledat"
        >
          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-3 px-4 border-b border-white/10"
            style={{ height: '56px', flexShrink: 0 }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-zinc-500 shrink-0" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
            </svg>
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat rappera, album, žánr…"
              style={{ fontSize: '16px', background: 'none', border: 'none', outline: 'none', color: 'white', flex: 1 }}
              className="placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => { setSearchOpen(false); setQuery('') }}
              className="text-sm text-zinc-400 px-1 py-1 shrink-0"
              style={{ cursor: 'pointer' }}
            >
              Zrušit
            </button>
          </form>

          {/* Tap outside to close */}
          <div
            className="flex-1"
            onClick={() => { setSearchOpen(false); setQuery('') }}
          />
        </div>
      )}
    </>
  )
}
