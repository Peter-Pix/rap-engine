/**
 * audit-missing-pages.mjs
 * 
 * Projede všechny MDX soubory a najde:
 * 1. Žánry referencované v `genre:` / `subgenres:` bez vlastní stránky v content/zanry/
 * 2. Labely referencované v `label:` / `labels:` / `labelName:` bez vlastní stránky v content/labely/
 * 3. Alba referencovaná v `relatedAlbums:` / `albumSlug:` bez vlastní stránky v content/alba/
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('/Users/petrpiskacek/.openclaw/workspace/Project_1/rap-engine-second-trial')
const CONTENT = join(ROOT, 'content')

// ─── Util: normalize genre slug (matches normalizeGenreSlug in code) ───
function normalizeGenreSlug(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, 'n')
    .replace(/[^a-z0-9\-]/g, '')
}

// ─── Util: normalize label slug ───
function normalizeLabelSlug(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
}

// ─── Util: parse frontmatter list field ───
function parseList(content, field) {
  const lines = content.split('\n')
  let inField = false
  const values = []
  for (const line of lines) {
    if (line.startsWith(`${field}:`)) {
      inField = true
      const inline = line.slice(field.length + 1).trim()
      if (inline.startsWith('[')) {
        try { return JSON.parse(inline.replace(/'/g, '"')) } catch {}
      }
      if (inline && !inline.startsWith('-')) {
        values.push(inline.replace(/^["']|["']$/g, '').trim())
        if (inline.startsWith('[')) continue // was parsed above
        break
      }
      continue
    }
    if (!inField) continue
    if (!line.startsWith(' ') && !line.startsWith('\t') && line.trim() !== '') break
    const item = line.trim().replace(/^-\s*/, '').replace(/^["']|["']$/g, '').trim()
    if (item) values.push(item)
  }
  return values.length > 0 ? values : null
}

// ─── Util: parse single frontmatter field ───
function parseField(content, field) {
  const m = content.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))
  if (!m) return null
  let value = m[1].trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return value || null
}

// ─── Collect existing pages ───
function collectSlugs(dir) {
  const dirPath = join(CONTENT, dir)
  if (!existsSync(dirPath)) return new Set()
  const slugs = new Set()
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith('.mdx')) continue
    const content = readFileSync(join(dirPath, file), 'utf8')
    const slug = parseField(content, 'slug')
    if (slug) slugs.add(slug)
  }
  return slugs
}

const existingZanry = collectSlugs('zanry')
const existingLabely = collectSlugs('labely')
const existingAlba = collectSlugs('alba')

console.log(`📊 Existující stránky:`)
console.log(`   Žánry:  ${existingZanry.size}`)
console.log(`   Labely: ${existingLabely.size}`)
console.log(`   Alba:   ${existingAlba.size}`)
console.log()

// ─── Collect references from ALL MDX files ───
const referencedGenres = new Map()   // normalizedSlug → { rawValue, sourceFile }
const referencedLabels = new Map()
const referencedAlbums = new Map()

function scanDir(dir) {
  const dirPath = join(CONTENT, dir)
  if (!existsSync(dirPath)) return
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith('.mdx')) continue
    const filepath = join(dirPath, file)
    const content = readFileSync(filepath, 'utf8')

    // ── Genres ──
    const genres = parseList(content, 'genre') || []
    const subgenres = parseList(content, 'subgenres') || []
    for (const g of [...genres, ...subgenres]) {
      const norm = normalizeGenreSlug(g)
      if (!referencedGenres.has(norm)) {
        referencedGenres.set(norm, { rawValue: g, sources: [] })
      }
      referencedGenres.get(norm).sources.push(file)
    }

    // ── Labels ──
    const label = parseField(content, 'label')
    const labels = parseList(content, 'labels') || []
    const labelName = parseField(content, 'labelName')
    for (const l of [label, labelName, ...labels].filter(Boolean)) {
      // Skip "Nezávislý" / "Nezávislá" / empty
      if (/^(nezavisl[ýá]|independent|self.released|vlastn[ií]\s*naklad)$/i.test(l.trim())) continue
      const norm = normalizeLabelSlug(l)
      if (!referencedLabels.has(norm)) {
        referencedLabels.set(norm, { rawValue: l, sources: [] })
      }
      referencedLabels.get(norm).sources.push(file)
    }

    // ── Albums ──
    const relatedAlbums = parseList(content, 'relatedAlbums') || []
    for (const a of relatedAlbums) {
      // Album references are slugs, not titles
      const slug = a.trim()
      if (!referencedAlbums.has(slug)) {
        referencedAlbums.set(slug, { rawValue: slug, sources: [] })
      }
      referencedAlbums.get(slug).sources.push(file)
    }
  }
}

// Scan all content directories
for (const dir of ['raperi', 'alba', 'skladby', 'labely', 'zanry', 'clanky']) {
  scanDir(dir)
}

// ─── Find missing ───
function findMissing(referenced, existing, label) {
  const missing = new Map()
  for (const [normSlug, data] of referenced) {
    if (!existing.has(normSlug)) {
      missing.set(normSlug, data)
    }
  }

  // Sort by number of references (most referenced first)
  const sorted = [...missing.entries()].sort((a, b) => b[1].sources.length - a[1].sources.length)

  console.log(`\n🔴 ${label} — CHYBÍ STRÁNKA (${sorted.length}):`)
  console.log(`   (řazeno podle počtu referencí)`)
  console.log()

  for (const [normSlug, data] of sorted) {
    const refCount = data.sources.length
    const badge = refCount >= 10 ? '🔥' : refCount >= 5 ? '⚠️' : '  '
    console.log(`   ${badge} "${data.rawValue}" → slug: ${normSlug} (${refCount}x referencí)`)
    // Show first 5 source files
    const sampleSources = data.sources.slice(0, 5)
    for (const src of sampleSources) {
      console.log(`      ← ${src}`)
    }
    if (data.sources.length > 5) {
      console.log(`      ← … a ${data.sources.length - 5} dalších`)
    }
    console.log()
  }

  return sorted
}

const missingGenres = findMissing(referencedGenres, existingZanry, 'ŽÁNRY')
const missingLabels = findMissing(referencedLabels, existingLabely, 'LABELY')
const missingAlbums = findMissing(referencedAlbums, existingAlba, 'ALBA')

// ─── Summary ───
console.log('═'.repeat(60))
console.log()
console.log(`📋 SOUHRN:`)
console.log(`   Žánry bez stránky:  ${missingGenres.length}`)
console.log(`   Labely bez stránky: ${missingLabels.length}`)
console.log(`   Alba bez stránky:   ${missingAlbums.length}`)
console.log()

// ─── Write detailed report ───
const reportLines = [
  '# Audit: Chybějící stránky',
  '',
  `Vygenerováno: ${new Date().toISOString()}`,
  '',
  'Referencované entity bez vlastní MDX stránky.',
  '',
]

reportLines.push('## 🔴 Žánry bez stránky')
reportLines.push('')
for (const [slug, data] of missingGenres) {
  reportLines.push(`- **${data.rawValue}** → \`${slug}\` (${data.sources.length}x referencí)`)
}

reportLines.push('')
reportLines.push('## 🔴 Labely bez stránky')
reportLines.push('')
for (const [slug, data] of missingLabels) {
  reportLines.push(`- **${data.rawValue}** → \`${slug}\` (${data.sources.length}x referencí)`)
}

reportLines.push('')
reportLines.push('## 🔴 Alba bez stránky')
reportLines.push('')
for (const [slug, data] of missingAlbums) {
  reportLines.push(`- **${data.rawValue}** → \`${slug}\` (${data.sources.length}x referencí)`)
}

writeFileSync(join(ROOT, 'work_in_progress', 'missing-pages-audit.md'), reportLines.join('\n') + '\n', 'utf8')
console.log('📄 Detailní report uložen do work_in_progress/missing-pages-audit.md')
