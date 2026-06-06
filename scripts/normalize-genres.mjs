import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const dirs = ['content/raperi', 'content/alba', 'content/skladby']

/**
 * Normalize genre string to consistent format:
 *   lowercase, spaces→hyphens, strip diacritics, handle special chars
 */
function normalizeGenre(raw) {
  let g = raw.trim()
  // Handle special cases first
  const specialMap = {
    'r&b': 'rnb',
    'r-n-b': 'rnb',
    'r n b': 'rnb',
    'boombap': 'boom-bap',
    'boom bap': 'boom-bap',
    'hip hop': 'hip-hop',
    'hiphop': 'hip-hop',
    'alternativní-rap': 'alternative-rap',
    'alternativni-rap': 'alternative-rap',
    'hardcore rap': 'hardcore-rap',
    'trap rap': 'trap',
    'street rap': 'street-rap',
    'streetrap': 'street-rap',
    'horror-core': 'horrorcore',
    'underground hip-hop': 'underground-hip-hop',
    'experimental hip-hop': 'experimental-hip-hop',
    'experimental hiphop': 'experimental-hip-hop',
    'alternative hiphop': 'alternative-hip-hop',
    'alternative hip-hop': 'alternative-hip-hop',
    'alternative-hiphop': 'alternative-hip-hop',
    'experimental-hiphop': 'experimental-hip-hop',
    'mainstream rap': 'mainstream-rap',
    'slovenský-rap': 'slovak-rap',
    'slovensky-rap': 'slovak-rap',
    'lyrical rap': 'lyrical-rap',
    // Merge joke/meta genres
    'neco-mezi-dark-rap-a-horror-core': 'dark-rap',
    'něco-mezi-dark-rap-a-horror-core': 'dark-rap',
    'something-between-rap-and-performance-art': 'experimental-rap',
    'pornorap': 'underground-rap',
    'comic-book-rap': 'alternative-rap',
    'underground': 'underground-rap',
  }

  // Normalize first
  const lower = g.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const hyphened = lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')

  // Check special map
  if (specialMap[hyphened]) return specialMap[hyphened]
  // Also check original lower
  if (specialMap[lower]) return specialMap[lower]

  return hyphened
}

// Read existing zanry to know what we have
const existingSlugs = new Set()
for (const f of readdirSync('content/zanry')) {
  if (f.endsWith('.mdx')) existingSlugs.add(f.replace('.mdx', ''))
}

// Walk all content files and normalize genres
const allGenres = new Map() // normalizedSlug → {original values, count}
let filesChanged = []
let filesScanned = 0

for (const dir of dirs) {
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mdx')) continue
    const filePath = join(dir, f)
    const content = readFileSync(filePath, 'utf-8')
    filesScanned++

    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) continue
    const fm = fmMatch[1]
    let newFm = fm
    let didChange = false

    // Handle multiline YAML: genre:\n  - "x"\n  - "y"
    const mlMatch = newFm.match(/^genre:\s*\n([\s\S]*?)(?=^[a-z])/m)
    if (mlMatch) {
      const block = mlMatch[0]
      const lines = block.split('\n')
      let newBlock = ''
      for (const line of lines) {
        const valMatch = line.match(/^(\s*-\s*)"([^"]+)"/)
        if (valMatch) {
          const leading = valMatch[1]
          const original = valMatch[2]
          const normalized = normalizeGenre(original)
          if (normalized !== original) {
            // Track counts
            if (!allGenres.has(normalized)) {
              allGenres.set(normalized, { originals: new Set(), count: 0 })
            }
            const entry = allGenres.get(normalized)
            entry.originals.add(original)
            entry.count++
            didChange = true
            newBlock += `${leading}"${normalized}"`
          } else {
            if (!allGenres.has(normalized)) {
              allGenres.set(normalized, { originals: new Set(), count: 0 })
            }
            allGenres.get(normalized).count++
            newBlock += line
          }
        } else {
          newBlock += line
        }
      }
      if (didChange) {
        newFm = newFm.replace(block, newBlock)
      }
    }

    // Handle inline array: genre: ["x", "y"]
    const ilMatch = newFm.match(/^genre:\s*\[(.*)\]/m)
    if (ilMatch && !mlMatch) {
      const originalBlock = ilMatch[0]
      const vals = ilMatch[1].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const normalized = vals.map(v => normalizeGenre(v).replace(/-/g, ' '))
      for (let i = 0; i < vals.length; i++) {
        const norm = normalizeGenre(vals[i])
        if (!allGenres.has(norm)) {
          allGenres.set(norm, { originals: new Set(), count: 0 })
        }
        if (vals[i] !== norm) {
          allGenres.get(norm).originals.add(vals[i])
        }
        allGenres.get(norm).count++
      }
      const quoted = normalized.map(v => `"${v}"`).join(', ')
      const newBlock = `genre: [${quoted}]`
      if (newBlock !== originalBlock) {
        newFm = newFm.replace(originalBlock, newBlock)
        didChange = true
      }
    }

    if (didChange) {
      const newContent = content.replace(fm, newFm)
      writeFileSync(filePath, newContent, 'utf-8')
      filesChanged.push(filePath)
    }
  }
}

// Report
console.log(`Proskenováno: ${filesScanned} souborů`)
console.log(`Změněno: ${filesChanged.length} souborů`)
console.log('')

// Show all normalized genres and their status
console.log('=== NORMALIZOVANÉ ŽÁNRY ===')
const sorted = [...allGenres.entries()].sort((a, b) => a[0].localeCompare(b[0]))

let hasPage = 0
let missing = 0
for (const [slug, info] of sorted) {
  const status = existingSlugs.has(slug) ? '✅' : '❌'
  if (existingSlugs.has(slug)) hasPage++
  else missing++
  const aliases = info.originals.size > 0 ? ` (aliasy: ${[...info.originals].join(', ')})` : ''
  console.log(`${status} ${slug.padEnd(30)} ${info.count}x${aliases}`)
}

console.log(`\nMá stránku: ${hasPage}`)
console.log(`Chybí: ${missing}`)

// List missing ones explicitly for easy copy-paste
if (missing > 0) {
  console.log('\n=== CHYBĚJÍCÍ ŽÁNRY (slugy) ===')
  const missingSlugs = sorted
    .filter(([slug]) => !existingSlugs.has(slug))
    .map(([slug]) => slug)
  console.log(missingSlugs.join('\n'))
}
