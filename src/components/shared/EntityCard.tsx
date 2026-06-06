import Link from 'next/link'

// ═══════════════════════════════════════════════════════════════
// EntityCard — unifikovaná listing karta pro magazín design
//
// Sjednocuje vzhled napříč rapper/album/label/zanr/skladba/clanek
// listingy. Každý typ má svoji barvu (entity-link paletu) + label.
//
// Layout matches magazín ArticleCard stylem (header row → title →
// description → tags → footer arrow), ale univerzálně.
// ═══════════════════════════════════════════════════════════════

export type EntityType = 'rapper' | 'album' | 'label' | 'zanr' | 'skladba' | 'clanek'

interface TypeStyle {
  label: string
  bg: string
  text: string
  ring: string
  dot: string
}

const STYLES: Record<EntityType, TypeStyle> = {
  rapper: {
    label: 'RAPPER',
    bg: 'bg-[#e4ff1a]/15',
    text: 'text-[#e4ff1a]',
    ring: 'ring-[#e4ff1a]/25',
    dot: 'bg-[#e4ff1a]',
  },
  album: {
    label: 'ALBUM',
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    ring: 'ring-sky-500/25',
    dot: 'bg-sky-400',
  },
  label: {
    label: 'LABEL',
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-400',
  },
  zanr: {
    label: 'ŽÁNR',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
  },
  skladba: {
    label: 'SKLADBA',
    bg: 'bg-pink-500/15',
    text: 'text-pink-300',
    ring: 'ring-pink-500/25',
    dot: 'bg-pink-400',
  },
  clanek: {
    label: 'ČLÁNEK',
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
    ring: 'ring-orange-500/25',
    dot: 'bg-orange-400',
  },
}

interface EntityCardProps {
  type: EntityType
  title: string
  description?: string
  href: string
  /** Sekundární meta info — např. rok alba, město labelu, label rappera */
  meta?: string
  tags?: string[]
  /** "Doporučeno" / "Featured" indikátor — žluté NEW pill */
  featured?: boolean
  /** Override defaultního type labelu — např. "EP" místo "ALBUM" */
  typeLabel?: string
  className?: string
}

export function EntityCard({
  type,
  title,
  description,
  href,
  meta,
  tags,
  featured,
  typeLabel,
  className = '',
}: EntityCardProps) {
  const s = STYLES[type]

  return (
    <Link
      href={href}
      className={[
        'group relative flex flex-col rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06]',
        'hover:bg-zinc-900/60 hover:ring-white/15 transition-all',
        'p-5 sm:p-6 h-full',
        className,
      ].join(' ')}
    >
      {/* Header row — type pill + meta + featured */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <span
          className={[
            'inline-flex items-center px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full ring-1',
            s.bg, s.text, s.ring,
          ].join(' ')}
        >
          {typeLabel ?? s.label}
        </span>
        {meta && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {meta}
          </span>
        )}
        {featured && (
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-widest bg-[#e4ff1a] text-zinc-950 rounded">
            ★
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight mb-2 group-hover:text-zinc-50 transition-colors">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-zinc-400 leading-relaxed mb-4 line-clamp-2 flex-1">
          {description}
        </p>
      )}

      {/* Tags — prvních 3 + indikátor zbytku, na mobilu nepraskají */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 overflow-hidden">
          {tags.filter(Boolean).slice(0, 3).map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-white/[0.03] rounded ring-1 ring-white/5 truncate max-w-[120px]"
            >
              {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 px-2 py-0.5">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer arrow */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
        <span className={['text-[10px] font-mono uppercase tracking-widest', s.text].join(' ')}>
          Zobrazit
        </span>
        <svg
          className={[
            'w-4 h-4 text-zinc-600 group-hover:translate-x-1 transition-all',
            `group-hover:${s.text}`.replace('text-', 'text-'),
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

// ─── HELPER: skinny inline chip (pro hero, breadcrumbs, related lists) ─

interface EntityChipProps {
  type: EntityType
  label: string
  href?: string
  className?: string
}

export function EntityChip({ type, label, href, className = '' }: EntityChipProps) {
  const s = STYLES[type]
  const cls = [
    'inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full ring-1 transition-colors',
    s.bg, s.text, s.ring,
    href && 'hover:brightness-125',
    className,
  ].filter(Boolean).join(' ')

  if (href) return <Link href={href} className={cls}>{label}</Link>
  return <span className={cls}>{label}</span>
}
