'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchBar } from '@/components/search/SearchBar'

const NAV = [
  { label: 'Rappeři', href: '/raperi' },
  { label: 'Alba', href: '/alba' },
  { label: 'Skladby', href: '/skladby' },
  { label: 'Labely', href: '/labely' },
  { label: 'Žánry', href: '/zanry' },
  { label: 'Články', href: '/clanky' },
]

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center gap-4 sm:gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="font-mono text-xl font-black tracking-tighter text-white group-hover:text-[#e4ff1a] transition-colors">
              4rap
              <span className="text-[#e4ff1a] group-hover:text-white transition-colors">.cz</span>
            </span>
            <span className="hidden lg:inline-block text-[10px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
              Beta
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2.5 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <div className="ml-auto flex-1 max-w-xs sm:max-w-sm">
            <SearchBar />
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Zavřít menu' : 'Otevřít menu'}
          >
            {isMenuOpen ? (
              /* X Icon */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              /* Hamburger Icon */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <nav className="md:hidden border-t border-white/[0.08] bg-zinc-950/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
