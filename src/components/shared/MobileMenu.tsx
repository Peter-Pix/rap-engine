'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════════════════════
// MobileMenu — full-height slide-in drawer pro touch UX
//
// Otvírá se z hamburger ikony v MagazineHeader. Obsahuje:
//   • Hlavní nav (Rappeři, Alba, Labely, Žánry, Články)
//   • Search field (open → /hledej?q=...)
//   • Sekundární odkazy (O projektu)
//
// Accessibility:
//   • role="dialog" + aria-modal
//   • Esc key zavře
//   • Focus trap přes "tab" key (TODO: pokud potřeba; native scroll lock zatím)
//   • Klik mimo drawer (overlay) zavře
//   • Body scroll lock když otevřené
//
// Mobile-first: zobrazené jen na <md (768px). Na desktopu schované.
// ═══════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { label: 'Magazín', href: '/', icon: '📰' },
  { label: 'Rappeři', href: '/raperi', icon: '🎤' },
  { label: 'Alba', href: '/alba', icon: '💿' },
  { label: 'Labely', href: '/labely', icon: '🏷️' },
  { label: 'Žánry', href: '/zanry', icon: '🎵' },
  { label: 'Skladby', href: '/skladby', icon: '🎧' },
  { label: 'Články', href: '/clanky', icon: '✍️' },
]

const SECONDARY = [
  { label: 'O projektu', href: '/o-projektu' },
  { label: 'Hledat', href: '/hledej' },
]

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname()
  const [searchValue, setSearchValue] = useState('')

  // Esc → close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on route change
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Backdrop — fade in/out */}
      <div
        aria-hidden
        onClick={onClose}
        className={[
          'fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer — slide from right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hlavní navigace"
        className={[
          'fixed inset-y-0 right-0 z-[61] w-[88vw] max-w-sm bg-zinc-950 ring-1 ring-white/10 md:hidden',
          'flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header row — close button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
          <span className="font-black text-lg tracking-tight text-white">
            <span className="text-emerald-400">4rap</span>.cz
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít menu"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors -mr-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search — opens /hledej s query */}
        <div className="px-4 py-4 border-b border-white/5 shrink-0">
          <form
            action="/hledej"
            method="get"
            className="relative"
            onSubmit={() => { onClose() }}
          >
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
            </svg>
            <input
              type="search"
              name="q"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Hledat rappera, album, žánr…"
              className="w-full bg-zinc-900/60 ring-1 ring-white/10 focus:ring-emerald-500/40 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition-all"
              autoComplete="off"
            />
          </form>
        </div>

        {/* Main nav — scrollable if needed */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={[
                      'flex items-center gap-3 px-3 py-3.5 rounded-xl text-base font-bold tracking-tight uppercase transition-colors min-h-[48px]',
                      active
                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
                        : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="text-xl" aria-hidden>{item.icon}</span>
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Sekundární odkazy */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 px-3 mb-2">
              Více
            </p>
            <ul className="space-y-1">
              {SECONDARY.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="block px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Footer — credit / version */}
        <div className="px-4 py-4 border-t border-white/5 shrink-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
            4rap.cz <span className="text-emerald-400">beta</span> · česká rapová scéna
          </p>
        </div>
      </div>
    </>
  )
}
