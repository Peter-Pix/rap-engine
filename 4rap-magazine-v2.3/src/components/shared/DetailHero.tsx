import type { ReactNode } from 'react'
import Link from 'next/link'
import { EntityChip, type EntityType } from './EntityCard'

// ═══════════════════════════════════════════════════════════════
// DetailHero v2.3 — diakritika-safe typography
//
// FIX v2.3:
//   • Desktop: max title text-5xl (48px) místo text-6xl (60px)
//   • Line-height vždy ≥ 1.05 (i na lg) — háčky/čárky nepřesahují
//   • Konzistentní s ListingHero a FeaturedHero
//
//   Před: "BEN CRIȘTOVAO: MUŽ..." — háčky cuts nad linkou
//   Po:    bezpečný clearance pro Š, Ě, Č, Ř, Ý, Á
// ═══════════════════════════════════════════════════════════════

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface DetailHeroProps {
  type: EntityType
  typeLabel?: string
  breadcrumbs?: BreadcrumbItem[]
  title: string
  subtitle?: string
  description?: string
  chips?: ReactNode
  meta?: ReactNode
  className?: string
}

export function DetailHero({
  type,
  typeLabel,
  breadcrumbs,
  title,
  subtitle,
  description,
  chips,
  meta,
  className = '',
}: DetailHeroProps) {
  return (
    <header className={['mb-8 sm:mb-12', className].join(' ')}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Drobečková navigace" className="mb-4 sm:mb-6">
          <ol className="flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500 overflow-x-auto scrollbar-none whitespace-nowrap">
            {breadcrumbs.map((b, i) => {
              const isLast = i === breadcrumbs.length - 1
              return (
                <li key={i} className="flex items-center gap-2 shrink-0">
                  {i > 0 && <span aria-hidden className="text-zinc-700">/</span>}
                  {b.href && !isLast ? (
                    <Link href={b.href} className="hover:text-zinc-300 transition-colors">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-zinc-300' : ''}>{b.label}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mb-4 sm:mb-6">
        <EntityChip type={type} label={typeLabel ?? type.toUpperCase()} />
        {chips}
        {meta && (
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 ml-auto">
            {meta}
          </div>
        )}
      </div>

      {/* Title — diakritika-safe scaling
          Mobile: 26px, tablet: 32px, md: 40px, lg: 48px
          Line-height vždy ≥1.05 → háčky se neukousnou */}
      <h1
        className="cz-display font-black uppercase text-white mb-3 sm:mb-4
                   text-[1.625rem] leading-[1.1]
                   sm:text-3xl sm:leading-[1.08] sm:tracking-tight
                   md:text-4xl md:leading-[1.06]
                   lg:text-5xl lg:leading-[1.05] lg:tracking-tight
                   text-balance hyphens-none"
      >
        {title}
      </h1>

      {subtitle && (
        <p className="text-sm sm:text-lg text-zinc-400 font-mono mb-3 sm:mb-4">
          {subtitle}
        </p>
      )}

      {description && (
        <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
    </header>
  )
}

interface DetailLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
  className?: string
}

export function DetailLayout({ children, sidebar, className = '' }: DetailLayoutProps) {
  return (
    <div
      className={[
        'grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12',
        className,
      ].join(' ')}
    >
      <main className="min-w-0">{children}</main>
      {sidebar && (
        <aside className="lg:sticky lg:top-24 lg:self-start lg:h-fit space-y-4">
          {sidebar}
        </aside>
      )}
    </div>
  )
}

interface SidebarCardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function SidebarCard({ title, children, className = '' }: SidebarCardProps) {
  return (
    <div
      className={[
        'rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06] p-5',
        className,
      ].join(' ')}
    >
      {title && (
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

interface InfoItem {
  label: string
  value: ReactNode
}

interface InfoDlProps {
  items: InfoItem[]
}

export function InfoDl({ items }: InfoDlProps) {
  const filtered = items.filter((i) => i.value !== undefined && i.value !== null && i.value !== '')
  if (filtered.length === 0) return null

  return (
    <dl className="space-y-3">
      {filtered.map((i) => (
        <div key={i.label}>
          <dt className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            {i.label}
          </dt>
          <dd className="text-sm text-zinc-200">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
