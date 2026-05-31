'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════
// MobileMenu v2.3 — bez emoji, bez search
//
// FIX v2.3:
//   • Pryč emoji ikony — nahrazené čistou typografií
//   • Pryč search input z drawer — jediný entry point je lupa
//     v hlavičce (žádný duplicitní search)
//   • Aktivní item: zelený text + zelený dot vpravo
// ═══════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { label: 'Magazín', href: '/' },
  { label: 'Rappeři', href: '/raperi' },
  { label: 'Alba', href: '/alba' },
  { label: 'Labely', href: '/labely' },
  { label: 'Žánry', href: '/zanry' },
  { label: 'Skladby', href: '/skladby' },
  { label: 'Články', href: '/clanky' },
]

const SECONDARY = [
  { label: 'O projektu', href: '/o-projektu' },
]

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

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
      <div
        aria-hidden
        onClick={onClose}
        className={[
          'fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hlavní navigace"
        className={[
          'fixed inset-y-0 right-0 z-[61] w-[85vw] max-w-sm bg-zinc-950 ring-1 ring-white/10 md:hidden',
          'flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header — jen logo + close */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10 shrink-0">
          <span className="font-black text-lg tracking-tight text-white leading-none">
            <span className="text-emerald-400">4rap</span>.cz
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít menu"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors -mr-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main nav — clean typography, NO icons */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={[
                      'flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-bold tracking-tight transition-colors',
                      active
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'text-zinc-200 hover:bg-white/[0.04] hover:text-white',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {SECONDARY.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/5">
              <ul className="space-y-0.5">
                {SECONDARY.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block px-4 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="px-4 py-3 border-t border-white/5 shrink-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
            4rap.cz <span className="text-emerald-400">beta</span> · česká rapová scéna
          </p>
        </div>
      </div>
    </>
  )
}
