import {
  allRappers,
  allAlbums,
  allLabels,
  allZanrs,
  allSkladbas,
  allClaneks,
} from 'contentlayer/generated'
import type { SearchDocument } from '@/lib/search'

// Prerendered jako static JSON file během buildu
export const dynamic = 'force-static'

export function GET() {
  const docs: SearchDocument[] = [
    ...allRappers.map((r) => ({
      id: `rapper:${r.slug}`,
      type: 'rapper' as const,
      title: r.title,
      slug: r.slug,
      url: r.url,
      description: r.description,
      context: [r.realName, r.label, ...(r.genre || [])].filter(Boolean).join(' '),
      featured: r.featured,
    })),
    ...allAlbums.map((a) => ({
      id: `album:${a.slug}`,
      type: 'album' as const,
      title: a.title,
      slug: a.slug,
      url: a.url,
      description: a.description,
      context: [a.rapper, a.label, String(a.year), ...(a.genre || [])].filter(Boolean).join(' '),
    })),
    ...allLabels.map((l) => ({
      id: `label:${l.slug}`,
      type: 'label' as const,
      title: l.title,
      slug: l.slug,
      url: l.url,
      description: l.description,
      context: [l.founded, l.location].filter(Boolean).join(' '),
    })),
    ...allZanrs.map((z) => ({
      id: `zanr:${z.slug}`,
      type: 'zanr' as const,
      title: z.title,
      slug: z.slug,
      url: z.url,
      description: z.description,
      context: z.origin || '',
    })),
    ...allSkladbas.map((s) => ({
      id: `skladba:${s.slug}`,
      type: 'skladba' as const,
      title: s.title,
      slug: s.slug,
      url: s.url,
      description: s.description,
      context: [s.rapper, s.album, ...(s.featuresNames || []), ...(s.genre || [])].filter(Boolean).join(' '),
    })),
    ...allClaneks.map((c) => ({
      id: `clanek:${c.slug}`,
      type: 'clanek' as const,
      title: c.title,
      slug: c.slug,
      url: c.url,
      description: c.description,
      context: [c.category, ...(c.tags || [])].filter(Boolean).join(' '),
      featured: c.featured,
    })),
  ]

  return Response.json({
    generatedAt: new Date().toISOString(),
    total: docs.length,
    documents: docs,
  })
}
