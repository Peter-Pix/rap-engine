'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MobileHeaderButtons } from './MobileHeaderButtons'

// ═══════════════════════════════════════════════════════════════
// MagazineHeader v2.4 — mobilní interaktivita přenesená do
// dedikovaného leaf client komponentu MobileHeaderButtons
//
// FIX v2.4:
//   • Mobilní tlačítka (search, hamburger) žijí v MobileHeaderButtons
//     → izolovaný client component bez SSR interference
//   • Desktop interaktivita (search input focus, ⌘K) zůstává tady
//   • Header je teď hybridní: desktop state zde, mobile state ve
//     svém dedikovaném leaf
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // ⌘K jen na desktopu
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (window.innerWidth >= 768) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const handleDesktopSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value?.trim()
    if (q) router.push(`/hledej?q=${encodeURIComponent(q)}`)
  }

  return (
    <header
      className={[
        'sticky top-0 z-50 backdrop-blur-md transition-all duration-200',
        scrolled
          ? 'bg-zinc-950/85 border-b border-white/10'
          : 'bg-zinc-950/40 border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="flex items-center h-12 sm:h-16 gap-2 sm:gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0" aria-label="4rap.cz">
            <span className="font-black text-base sm:text-xl md:text-2xl tracking-tight text-white leading-none">
              <span className="text-emerald-400">4rap</span>.cz
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-widest bg-white/[0.06] text-zinc-400 ring-1 ring-white/10">
              BETA
            </span>
          </Link>

          {/* DESKTOP nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none" aria-label="Hlavní navigace">
            {NAV.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'px-3 py-2 text-sm font-bold tracking-tight whitespace-nowrap transition-colors rounded-lg shrink-0',
                    active ? 'text-white bg-white/[0.06]' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]',
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
            onSubmit={handleDesktopSearch}
            className="hidden md:flex relative items-center max-w-sm w-full shrink-0"
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

          {/* DESKTOP unread badge */}
          {typeof unreadCount === 'number' && unreadCount > 0 && (
            <Link
              href="/?filter=unread"
              className="hidden md:inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-mono font-black bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition-colors shrink-0"
              aria-label={`${unreadCount} novinek`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Link>
          )}

          {/* Spacer (mobile only) */}
          <div className="flex-1 md:hidden" aria-hidden />

          {/* MOBILE interaktivita — dedikovaný client leaf */}
          <MobileHeaderButtons unreadCount={unreadCount} />

        </div>
      </div>
    </header>
  )
}
