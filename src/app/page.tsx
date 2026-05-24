import { allRappers, allAlbums, allLabels, allClaneks } from 'contentlayer/generated'
import { EntityCard } from '@/components/entity/EntityCard'
import Link from 'next/link'

export default function HomePage() {
  const featuredRappers = allRappers
    .filter((r) => r.featured)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 6)

  const recentAlbums = allAlbums
    .sort((a, b) => b.year - a.year)
    .slice(0, 4)

  // ─── ČLÁNKY ─── featured first, then recent (deduplicated)
  const featuredClanky = allClaneks
    .filter((c) => c.featured)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)

  const recentClanky = allClaneks
    .filter((c) => !featuredClanky.find((f) => f.slug === c.slug))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, featuredClanky.length > 0 ? 3 : 6)

  const stats = {
    rappers: allRappers.length,
    albums: allAlbums.length,
    labels: allLabels.length,
    clanky: allClaneks.length,
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">

      {/* Hero */}
      <section className="mb-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#e4ff1a] bg-[#e4ff1a]/10 border border-[#e4ff1a]/20 px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e4ff1a] animate-pulse" />
            Databáze — Česká Rap Scéna
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.95] mb-6">
            Největší<br />
            <span className="text-[#e4ff1a]">databáze</span><br />
            českého rapu
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed mb-8">
            Propojená síť informací o české rapové scéně. Rappeři, alba, labely a žánry.
          </p>

          <div className="flex items-center gap-6">
            <Link href="/clanky" className="inline-flex items-center gap-2 bg-[#e4ff1a] text-zinc-950 font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-white transition-colors">
              Přejít na články
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats — Skladby vyměněno za Články */}
        <div className="mt-12 grid grid-cols-4 gap-3 max-w-2xl">
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

      {/* Featured Rappeři */}
      {featuredRappers.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-zinc-100">Rappeři</h2>
            <Link href="/raperi" className="text-sm text-zinc-500 hover:text-[#e4ff1a] transition-colors font-mono">
              Všichni →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredRappers.map((rapper) => (
              <EntityCard
                key={rapper.slug}
                title={rapper.title}
                description={rapper.description}
                href={rapper.url}
                type="rapper"
                meta={rapper.label}
                tags={rapper.genre}
                featured={rapper.featured}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Alba */}
      {recentAlbums.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-zinc-100">Alba</h2>
            <Link href="/alba" className="text-sm text-zinc-500 hover:text-[#60a5fa] transition-colors font-mono">
              Všechna →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentAlbums.map((album) => (
              <EntityCard
                key={album.slug}
                title={album.title}
                description={album.description}
                href={album.url}
                type="album"
                meta={`${album.rapper} · ${album.year}`}
                tags={album.genre}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── MAGAZÍN ─── Featured + Recent články */}
      {(featuredClanky.length > 0 || recentClanky.length > 0) && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#fb923c] mb-1">Magazín</p>
              <h2 className="text-xl font-bold text-zinc-100">
                {featuredClanky.length > 0 ? 'Doporučené & nejnovější' : 'Nejnovější články'}
              </h2>
            </div>
            <Link href="/clanky" className="text-sm text-zinc-500 hover:text-[#fb923c] transition-colors font-mono">
              Všechny →
            </Link>
          </div>

          {/* Featured (větší karty, max 3) */}
          {featuredClanky.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {featuredClanky.map((clanek) => (
                <EntityCard
                  key={clanek.slug}
                  title={clanek.title}
                  description={clanek.description}
                  href={clanek.url}
                  type="clanek"
                  meta={clanek.category}
                  tags={clanek.tags}
                  featured={clanek.featured}
                />
              ))}
            </div>
          )}

          {/* Recent (kompaktnější) */}
          {recentClanky.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentClanky.map((clanek) => (
                <EntityCard
                  key={clanek.slug}
                  title={clanek.title}
                  description={clanek.description}
                  href={clanek.url}
                  type="clanek"
                  meta={clanek.category}
                  tags={clanek.tags}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Engine CTA */}
      <section className="mt-20">
        <div className="glass rounded-2xl p-8 md:p-12 border border-[#e4ff1a]/10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-white mb-3">4RapEngine</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Všechno o hip hopu na jednoum místě.
            </p>
            <div className="flex flex-wrap gap-3">
              {['rappeři', 'alba', 'skladby', 'labely', 'žánry', 'články'].map((path) => (
                <span key={path} className="text-xs font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
                  {path}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
