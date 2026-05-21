import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-mono text-lg font-black text-white">4rap<span className="text-[#e4ff1a]">.cz</span></Link>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">Největší propojená databáze<br />české rapové scény.</p>
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-3">Databáze</h3>
            <ul className="space-y-2">
              {[['Rappeři','/raperi'],['Alba','/alba'],['Labely','/labely'],['Žánry','/zanry']].map(([l,h]) => (
                <li key={h}><Link href={h} className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-3">Magazín</h3>
            <ul className="space-y-2">
              {[['Články','/clanky'],['Recenze','/clanky'],['Novinky','/clanky']].map(([l,h]) => (
                <li key={l}><Link href={h} className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-3">Engine</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">Každý odkaz je generovaný automaticky. Každé metadata jsou dynamická. Každá URL je indexovatelná.</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} 4rap.cz</p>
          <p className="text-xs font-mono text-zinc-700">RapEngine v1.0</p>
        </div>
      </div>
    </footer>
  )
}
