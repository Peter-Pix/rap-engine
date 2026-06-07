// ═══════════════════════════════════════════════════════════════
// RAPENGINE — Auto-Interlinking Remark Plugin
//
// Při buildu prochází MDX AST a každý výskyt jména entity
// (rapper, label, žánr) transformuje na hyperlink.
//
// Pravidla:
// - Skipne text uvnitř <a>, <code>, <pre>, headings
// - Skipne self-references (článek o Yzomandias nelinkuje sám sebe)
//   → slug se čte z Contentlayer rawDocumentData (file.path je UUID
//     virtuálního mdx-bundler entry pointu, takže ze samotné cesty
//     skutečný slug nezískáme)
// - Case-sensitive matching, slovní hranice
// - Delší jména mají prioritu (Vladimír 518 před Vladimír)
// ═══════════════════════════════════════════════════════════════

import { visit, SKIP } from 'unist-util-visit'
import type { Root, Text, Parent, RootContent } from 'mdast'
import type { VFile } from 'vfile'

export interface InterlinkEntity {
  name: string
  slug: string
  type: 'rapper' | 'album' | 'label' | 'zanr'
  aliases?: string[]
  /** Default true. False pro generické pojmy (žánry typu "drill"). */
  caseSensitive?: boolean
}

interface InterlinkOptions {
  registry: InterlinkEntity[]
}

const TYPE_TO_PATH: Record<InterlinkEntity['type'], string> = {
  rapper: '/raperi',
  album: '/alba',
  label: '/labely',
  zanr: '/zanry',
}

const SKIP_PARENT_TYPES = new Set([
  'link', 'inlineCode', 'code', 'html', 'heading',
])

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Vrátí slug a typ aktuálního dokumentu z Contentlayer VFile.
 * Contentlayer předává `file.data.rawDocumentData` se zdrojovou cestou.
 */
function getCurrentDocument(file: VFile): { slug: string; type: string } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (file?.data as any)?.rawDocumentData
  if (!raw?.sourceFileName) return null
  const slug = raw.sourceFileName.replace(/\.mdx$/, '')
  const type = raw.sourceFileDir || ''
  return { slug, type }
}

export function remarkInterlinking(options: InterlinkOptions) {
  const { registry } = options
  // Seřaď podle délky — delší jména první (Vladimír 518 před Vladimír)
  const sortedRegistry = [...registry].sort((a, b) => b.name.length - a.name.length)

  return (tree: Root, file: VFile) => {
    const current = getCurrentDocument(file)
    const currentSlug = current?.slug || ''
    const currentDir = current?.type || ''

    // První průchod: označ všechny text nody uvnitř odkazů
    // (uživatelský markdown [text](url) — nesmíme dovnitř přidávat další <a>)
    const textInsideLink = new WeakSet<Text>()
    visit(tree, 'link', (linkNode) => {
      visit(linkNode, 'text', (tn: Text) => {
        textInsideLink.add(tn)
      })
    })

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      if (textInsideLink.has(node)) return
      if (SKIP_PARENT_TYPES.has(parent.type)) return

      const text = node.value
      if (!text || text.length < 3) return

      // Normalizace: pomlčka → mezera (slug "conscious-rap" odpovídá jménu "Conscious Rap")
      // Oba znaky maj 1:1 délku — pozice v původním i normalizovaném textu seděj
      const normalizedText = text.replace(/-/g, ' ')
      const needsDenormalize = normalizedText !== text

      type Match = {
        start: number
        end: number
        entity: InterlinkEntity
        matched: string
      }
      const matches: Match[] = []

      for (const entity of sortedRegistry) {
        // Skip self-references (článek o entitě nelinkuje sám sebe)
        const entityDirMap: Record<string, string> = {
          rapper: 'raperi',
          album: 'alba',
          label: 'labely',
          zanr: 'zanry',
        }
        if (
          entity.slug === currentSlug &&
          entityDirMap[entity.type] === currentDir
        ) {
          continue
        }

        const names = [entity.name, ...(entity.aliases || [])]
        for (const name of names) {
          const flags = entity.caseSensitive === false ? 'gi' : 'g'
          const haystack = needsDenormalize ? normalizedText : text
          const regex = new RegExp(
            `(?<![A-Za-z\\u00C0-\\u024F])${escapeRegex(name)}(?![A-Za-z\\u00C0-\\u024F])`,
            flags,
          )
          let m: RegExpExecArray | null
          while ((m = regex.exec(haystack)) !== null) {
            // Vrať původní text (s pomlčkama) jako matched string
            const matched = text.slice(m.index, m.index + m[0].length)
            matches.push({
              start: m.index,
              end: m.index + m[0].length,
              entity,
              matched,
            })
          }
        }
      }

      if (matches.length === 0) return

      // Seřaď podle pozice; při překryvu vyhraje delší
      matches.sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start
        return (b.end - b.start) - (a.end - a.start)
      })

      const filtered: Match[] = []
      let lastEnd = -1
      for (const m of matches) {
        if (m.start >= lastEnd) {
          filtered.push(m)
          lastEnd = m.end
        }
      }

      if (filtered.length === 0) return

      // Sestav nové AST nodes — text + link + text + link + ...
      const newChildren: RootContent[] = []
      let cursor = 0
      for (const m of filtered) {
        if (m.start > cursor) {
          newChildren.push({
            type: 'text',
            value: text.slice(cursor, m.start),
          } as Text)
        }
        newChildren.push({
          type: 'link',
          url: `${TYPE_TO_PATH[m.entity.type]}/${m.entity.slug}`,
          title: null,
          data: {
            hProperties: {
              className: ['entity-link', `entity-link--${m.entity.type}`],
              'data-entity-type': m.entity.type,
              'data-entity-slug': m.entity.slug,
            },
          },
          children: [{ type: 'text', value: m.matched } as Text],
        } as RootContent)
        cursor = m.end
      }
      if (cursor < text.length) {
        newChildren.push({
          type: 'text',
          value: text.slice(cursor),
        } as Text)
      }

      ;(parent as Parent).children.splice(index, 1, ...newChildren)
      return [SKIP, index + newChildren.length]
    })
  }
}
