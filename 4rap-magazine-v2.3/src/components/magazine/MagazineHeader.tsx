'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MobileMenu } from '@/components/shared/MobileMenu'

// ═══════════════════════════════════════════════════════════════
// MagazineHeader v2.3
//
// FIX v2.3:
//   • Notification badge je teď emerald (sladěné s logem) místo žluté
//     • Mobile: w-6 h-6 (24px)
//     • Desktop: w-7 h-7 (28px)
//   • Subtle treatment: bg-emerald-500/15 + ring místo plné výplně
//   • Méně agresivní, ale stále viditelný indikátor
// ═══════════════════════════════════════════════════════════════

const NAV = [
  { label: 'Rappeři', href: '/raperi' },
  { label: 'Alba', href: '/alba' },
  { label: 'Labely', href: '/labely' },
  { label: 'Žánry', href: '/zanry' },
  { label: 'Skladby', href: '/skladby' },
  { label: 'Články', href: '/clanky' },
]

interface MagazineHeaderProps {
  unreadCount?: number
}

export function MagazineHeader({ unreadCount }: MagazineHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (window.innerWidth >= 768) {
          searchInputRef.current?.focus()
        } else {
          setSearchOpen((v) => !v)
        }
      }
      if (e.key === 'Escape' && searchOpen) setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const q = (form.elements.namedItem('q') as HTMLInputElement)?.value?.trim()
    if (!q) return
    router.push(`/hledej?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
  }

  // Subtle emerald badge
  const badgeClass = 'inline-flex items-center justify-center rounded-full font-mono font-black bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition-colors'

  return (
    <>
      <header
        className={[
          'mh-root sticky top-0 z-50 backdrop-blur-md transition-all duration-200',
          scrolled
            ? 'bg-zinc-950/85 border-b border-white/10'
            : 'bg-zinc-950/40 border-b border-transparent',
        ].join(' ')}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex items-center h-12 sm:h-16 gap-2 sm:gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0" aria-label="4rap.cz — domů">
              <span className="font-black text-base sm:text-xl md:text-2xl tracking-tight text-white leading-none">
                <span className="text-emerald-400">4rap</span>.cz
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-widest bg-white/[0.06] text-zinc-400 ring-1 ring-white/10">
                BETA
              </span>
            </Link>

            {/* DESKTOP nav */}
            <nav
              className="mh-desktop items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none"
              aria-label="Hlavní navigace"
            >
              {NAV.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'px-3 py-2 text-sm font-bold tracking-tight whitespace-nowrap transition-colors rounded-lg shrink-0',
                      active
                        ? 'text-white bg-white/[0.06]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* DESKTOP search */}
            <form
              onSubmit={handleSearchSubmit}
              className="mh-desktop relative items-center max-w-sm w-full shrink-0"
              role="search"
            >
              <svg className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                name="q"
                placeholder="Hledat rappera, album…"
                className="w-full bg-zinc-900/60 ring-1 ring-white/10 focus:ring-emerald-500/40 focus:bg-zinc-900 rounded-xl pl-9 pr-12 py-2 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
                autoComplete="off"
              />
              <kbd className="absolute right-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-500 bg-white/[0.04] rounded ring-1 ring-white/10 pointer-events-none">
                ⌘K
              </kbd>
            </form>

            {/* DESKTOP unread badge — emerald, smaller */}
            {typeof unreadCount === 'number' && unreadCount > 0 && (
              <Link
                href="/?filter=unread"
                className={`mh-desktop ${badgeClass} w-7 h-7 text-[11px] shrink-0`}
                aria-label={`${unreadCount} novinek`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Link>
            )}

            {/* Spacer */}
            <div className="mh-mobile-spacer flex-1" aria-hidden />

            {/* MOBILE actions */}
            <div className="mh-mobile items-center gap-1 shrink-0">
              {typeof unreadCount === 'number' && unreadCount > 0 && (
                <Link
                  href="/?filter=unread"
                  className={`${badgeClass} w-6 h-6 text-[10px]`}
                  aria-label={`${unreadCount} novinek`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Hledat"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-zinc-300 active:bg-white/[0.08] transition-colors"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Otevřít menu"
                aria-expanded={mobileOpen}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-zinc-300 active:bg-white/[0.08] transition-colors -mr-1"
              >
                <svg className="w-[20px] h-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {searchOpen && (
        <div
          className="mh-mobile-overlay fixed inset-0 z-[65] bg-zinc-950/95 backdrop-blur-md flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Hledat"
        >
          <div className="flex items-center gap-2 px-3 h-12 border-b border-white/10">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
              </svg>
              <input
                type="search"
                name="q"
                autoFocus
                placeholder="Hledat rappera, album, žánr…"
                className="w-full bg-zinc-900/80 ring-1 ring-white/10 rounded-xl pl-10 pr-3 py-2 text-base text-white placeholder:text-zinc-500 outline-none"
              />
            </form>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-sm text-zinc-400 hover:text-white px-2 py-2"
            >
              Zrušit
            </button>
          </div>
          <div className="flex-1 px-4 py-6">
            <p className="text-xs text-zinc-500">
              Enter hledá v celé databázi. <kbd className="text-zinc-400">Esc</kbd> zavře.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
