import Link from 'next/link'

const NAV = [
  { label: 'Rappeři', href: '/raperi' },
  { label: 'Alba', href: '/alba' },
  { label: 'Labely', href: '/labely' },
  { label: 'Žánry', href: '/zanry' },
  { label: 'Články', href: '/clanky' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-mono text-xl font-black tracking-tighter text-white group-hover:text-[#e4ff1a] transition-colors">
              4rap<span className="text-[#e4ff1a] group-hover:text-white transition-colors">.cz</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">Beta</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex md:hidden items-center gap-3">
            {NAV.slice(0, 3).map((item) => (
              <Link key={item.href} href={item.href} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">{item.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
