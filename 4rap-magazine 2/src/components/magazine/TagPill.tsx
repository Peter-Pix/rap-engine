import Link from 'next/link'

// ═══════════════════════════════════════════════════════════════
// TagPill — hashtag pilulka (#kato, #milion-plus)
//
// Klikatelná → /clanky?tag=<slug> (filtruje feed na daný tag).
// Délka tagů varíruje — používáme `inline-flex` + `whitespace-nowrap`.
// Více tagů v řadě se "wrappuje" do dalších řádků.
// ═══════════════════════════════════════════════════════════════

interface TagPillProps {
  tag: string
  /** Pokud false, nerenderuje <Link>, jen <span>. Užitečné v sidebar preview. */
  clickable?: boolean
  className?: string
}

function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function displayTag(tag: string): string {
  // Zachovat původní psaní pokud má diakritiku, jen prefix #
  return tag.startsWith('#') ? tag : `#${tag}`
}

export function TagPill({ tag, clickable = true, className = '' }: TagPillProps) {
  const cls = [
    'inline-flex items-center px-2 py-1 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap',
    'bg-white/[0.04] text-zinc-400 rounded-md ring-1 ring-white/5',
    clickable && 'hover:bg-white/[0.08] hover:text-zinc-200 hover:ring-white/10 transition-colors',
    className,
  ].filter(Boolean).join(' ')

  if (!clickable) return <span className={cls}>{displayTag(tag)}</span>

  return (
    <Link href={`/clanky?tag=${encodeURIComponent(tagToSlug(tag))}`} className={cls}>
      {displayTag(tag)}
    </Link>
  )
}

interface TagListProps {
  tags: string[]
  /** Po překročení limitu zbylé schová za "+N" indikátor */
  limit?: number
  clickable?: boolean
  className?: string
}

export function TagList({ tags, limit, clickable = true, className = '' }: TagListProps) {
  if (!tags?.length) return null

  const visible = limit ? tags.slice(0, limit) : tags
  const hidden = limit ? Math.max(0, tags.length - limit) : 0

  return (
    <div className={['flex flex-wrap gap-1.5', className].join(' ')}>
      {visible.map((t) => (
        <TagPill key={t} tag={t} clickable={clickable} />
      ))}
      {hidden > 0 && (
        <span className="inline-flex items-center px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          +{hidden}
        </span>
      )}
    </div>
  )
}
