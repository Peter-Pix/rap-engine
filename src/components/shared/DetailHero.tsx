import type { ReactNode } from 'react'
import Link from 'next/link'
import { EntityChip, type EntityType } from './EntityCard'

// ═══════════════════════════════════════════════════════════════
// DetailHero — header pro detail pages (rapper, album, label, ...)
//
// Layout:
//   [< Breadcrumb >]
//   [type pill] [chips...] [meta]
//   BIG UPPERCASE TITLE
//   [subtitle / real name / artist]
//   [supportive description / lead]
//
// Magazín-style typography: tight tracking, uppercase title, bold.
// Mobile: stack vertikálně, breadcrumbs single line scrollable.
// ═══════════════════════════════════════════════════════════════

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface DetailHeroProps {
  type: EntityType
  /** Volitelný typ override label — "EP" místo "ALBUM" atd. */
  typeLabel?: string

  breadcrumbs?: BreadcrumbItem[]
  title: string
  /** Sekundární text pod titlem (skutečné jméno, autor, podtitul) */
  subtitle?: string
  /** Lead — 1–2 věty pod subtitle */
  description?: string

  /** Pillula/chipy v hlavičce — genres, year, label affiliation */
  chips?: ReactNode
  /** Meta — datum, počty, statusové info */
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
      {/* Breadcrumbs — scrollable na mobilu, nezlomí se */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Drobečková navigace" className="mb-4 sm:mb-6 overflow-x-auto">
          <ol className="flex items-center gap-x-1.5 text-[11px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500 leading-tight whitespace-nowrap">
            {breadcrumbs.map((b, i) => {
              const isLast = i === breadcrumbs.length - 1
              return (
                <li key={i} className="flex items-center gap-1.5 shrink-0">
                  {i > 0 && <span aria-hidden className="text-zinc-700 text-[10px]">/</span>}
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

      {/* Header row: type pill + chips + meta */}
      <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
        <EntityChip type={type} label={typeLabel ?? type.toUpperCase()} />
        <div className="flex flex-wrap items-center gap-2 max-w-full overflow-hidden">{chips}</div>
        {meta && (
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 ml-auto shrink-0">
            {meta}
          </div>
        )}
      </div>

      {/* Title — massive uppercase */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-4 break-words hyphens-auto">
        {title}
      </h1>

      {subtitle && (
        <p className="text-base sm:text-lg text-zinc-400 font-mono mb-4">
          {subtitle}
        </p>
      )}

      {description && (
        <p className="text-base sm:text-lg text-zinc-300 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
    </header>
  )
}

// ─── DetailLayout — 2-col with sidebar that stacks on mobile ────

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

// ─── SidebarCard — boxík v detail sidebaru ──────────────────────

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

// ─── InfoDl — definition list pro sidebar cards ─────────────────

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
