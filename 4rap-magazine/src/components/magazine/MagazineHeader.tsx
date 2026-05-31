'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════════════════════
// MagazineHeader — sticky top nav
//
// Logo "# 4RAP" + 5 hlavních sekcí + notif badge + search button.
// Aktivní item podle pathname.
// Mobile: collapse do hamburger (TBD - desktop-first MVP).
//
// Counter "10" je placeholder — můžeš ho napojit na "nepřečtené články"
// nebo "novinky v posledních X dnech" (viz useEffect níže).
// ═══════════════════════════════════════════════════════════════

const NAV = [
  { label: 'MAGAZÍN', href: '/' },
  { label: 'RAPPEŘI', href: '/raperi' },
  { label: 'ALBA', href: '/alba' },
  { label: 'LABELY', href: '/labely' },
  { label: 'ŽÁNRY', href: '/zanry' },
]

interface MagazineHeaderProps {
  /** Číslo v žlutém badge — defaultně novinky za 7 dní */
  unreadCount?: number
}

export function MagazineHeader({ unreadCount }: MagazineHeaderProps) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  // Subtle backdrop reinforcement při scrollování
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  return (
    <header
      className={[
        'sticky top-0 z-50 backdrop-blur-md transition-colors duration-200',
        scrolled
          ? 'bg-zinc-950/85 border-b border-white/10'
          : 'bg-zinc-950/40 border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center h-16 gap-3 sm:gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="4RAP — domů">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-emerald-500/60 group-hover:border-emerald-400 transition-colors font-mono font-black text-base text-emerald-400"
              aria-hidden
            >
              #
            </span>
            <span className="font-black text-xl tracking-tight text-white group-hover:text-zinc-100 transition-colors">
              4RAP
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
            {NAV.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded-md whitespace-nowrap transition-colors',
                    active
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Akce */}
          <div className="flex items-center gap-2 shrink-0">
            {typeof unreadCount === 'number' && unreadCount > 0 && (
              <Link
                href="/?filter=unread"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#e4ff1a] text-zinc-950 font-mono font-black text-xs hover:bg-yellow-300 transition-colors"
                aria-label={`${unreadCount} novinek`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Link>
            )}

            <Link
              href="/hledej"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-300 transition-colors"
              aria-label="Hledat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
