// ═══════════════════════════════════════════════════════════════
// PŘESUN STARÉ HOMEPAGE → /o-projektu
//
// Tahle stránka obsahuje původní hero "Budujeme databázu českého
// rapu" + statistiky + featured rappers/alba/labely. Nahradila ji
// magazín-first homepage.
//
// Pokud nechceš mít /o-projektu, smaž celý tento soubor.
// ═══════════════════════════════════════════════════════════════

import { allRappers, allAlbums, allLabels, allClaneks } from 'contentlayer/generated'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'O projektu — 4RAP',
  description: 'Databáze české rapové scény — rappeři, alba, labely a žánry propojené do souvislého ekosystému.',
  alternates: { canonical: 'https://4rap.cz/o-projektu' },
}

export default function OProjektuPage() {
  const stats = {
    rappers: allRappers.length,
    albums: allAlbums.length,
    labels: allLabels.length,
    clanky: allClaneks.length,
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <section className="mb-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#e4ff1a] bg-[#e4ff1a]/10 border border-[#e4ff1a]/20 px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e4ff1a] animate-pulse" />
            O projektu
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.95] mb-6">
            Budujeme<br />
            <span className="text-[#e4ff1a]">databázi</span><br />
            českého rapu
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed mb-8">
            Propojená síť informací o české rapové scéně. Rappeři, alba, labely a žánry —
            všechno provázané do souvislého ekosystému, ne jako náhodné MDX soubory.
          </p>

          <div className="flex items-center gap-6">
            <Link href="/" className="inline-flex items-center gap-2 bg-[#e4ff1a] text-zinc-950 font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-white transition-colors">
              Zpět na magazín
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
          {[
            { label: 'Rappeři', value: stats.rappers },
            { label: 'Alba', value: stats.albums },
            { label: 'Články', value: stats.clanky },
            { label: 'Labely', value: stats.labels },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-black font-mono text-[#e4ff1a]">{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
