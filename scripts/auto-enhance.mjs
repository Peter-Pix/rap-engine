#!/usr/bin/env node
/**
 * auto-enhance.mjs
 * Jednorázový běh: vybere 1 generický rapper profil a vylepší ho z lokálních dat.
 * Použití: node scripts/auto-enhance.mjs [--force]
 * --force = vybere i profily s "<!-- auto-enhance: skipped -->" markerem
 * Výstup: vylepšený .mdx soubor + git commit checkpoint (NE pushuje)
 * Log: work_in_progress/auto-enhance-log.md
 */

import { execSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, appendFileSync } from 'fs'
import { join, basename } from 'path'

const CONTENT_DIR = 'content'
const RAPERI_DIR = join(CONTENT_DIR, 'raperi')
const ALBA_DIR = join(CONTENT_DIR, 'alba')
const SKLADBY_DIR = join(CONTENT_DIR, 'skladby')
const LABELY_DIR = join(CONTENT_DIR, 'labely')
const LOG_FILE = 'work_in_progress/auto-enhance-log.md'
const CHECKPOINT_PREFIX = 'auto-enhance:'

const FORCE_MODE = process.argv.includes('--force')

// ─── Helpers ─────────────────────────────────────────────────

function getMdxFiles(dir) {
  const files = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (full.endsWith('.mdx')) files.push(full)
    }
  }
  walk(dir)
  return files
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const lines = match[1].split('\n')
  const fm = {}
  let currentKey = null
  for (const line of lines) {
    if (line.startsWith('  - ')) {
      if (!fm[currentKey]) fm[currentKey] = []
      fm[currentKey].push(line.replace(/^\s+-\s*/, '').replace(/["']/g, ''))
    } else {
      const m = line.match(/^([^:]+):\s*(.*)$/)
      if (m) {
        currentKey = m[1].trim()
        fm[currentKey] = m[2].trim().replace(/["']/g, '')
      }
    }
  }
  return fm
}

function getBody(text) {
  const match = text.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return match ? match[1].trim() : ''
}

function findAlbumsForRapper(slug) {
  const albums = []
  for (const file of getMdxFiles(ALBA_DIR)) {
    const text = readFileSync(file, 'utf-8')
    const fm = parseFrontmatter(text)
    if (fm.rapperSlug === slug || fm.artist === slug || fm.rapper === slug) {
      albums.push({
        title: fm.title || basename(file, '.mdx'),
        slug: basename(file, '.mdx'),
        year: fm.year || '',
        genre: fm.genre || '',
        file
      })
    }
  }
  return albums
}

function findTracksForRapper(slug) {
  const tracks = []
  for (const file of getMdxFiles(SKLADBY_DIR)) {
    const text = readFileSync(file, 'utf-8')
    const fm = parseFrontmatter(text)
    if (fm.rapperSlug === slug || fm.rapper === slug) {
      const features = Array.isArray(fm.featuresNames) ? fm.featuresNames : (fm.featuresNames ? [fm.featuresNames] : [])
      tracks.push({
        title: fm.title || basename(file, '.mdx'),
        slug: basename(file, '.mdx'),
        year: fm.year || '',
        features,
        file
      })
    }
  }
  return tracks
}

function findLabelForRapper(slug) {
  for (const file of getMdxFiles(LABELY_DIR)) {
    const text = readFileSync(file, 'utf-8')
    const fm = parseFrontmatter(text)
    if (fm.artists && Array.isArray(fm.artists)) {
      if (fm.artists.includes(slug)) return {
        title: fm.title || '',
        slug: fm.slug || basename(file, '.mdx'),
        founded: fm.founded || '',
        location: fm.location || ''
      }
    }
  }
  return null
}

// ─── Enhancer ─────────────────────────────────────────────────

function enhanceRapper(filePath) {
  const text = readFileSync(filePath, 'utf-8')
  const fm = parseFrontmatter(text)
  const slug = fm.slug || basename(filePath, '.mdx')
  const title = fm.title || slug

  console.log(`🔍 ${title} (${slug})`)

  // Gather local data
  const albums = findAlbumsForRapper(slug)
  const tracks = findTracksForRapper(slug)
  const label = findLabelForRapper(slug)
  const hasData = albums.length > 0 || tracks.length > 0 || label || (fm.description && fm.description.length > 10)

  if (!hasData) {
    const reason = 'Nedostatek lokálních dat (0 alb, 0 skladeb, žádný label, žádný popis).'
    console.log(`⏭️  ${reason}`)
    return { success: false, reason, slug, title }
  }

  // Build enhanced content
  let body = `\n## O rapperovi\n\n**[${title}](/raperi/${slug})**`
  if (fm.realName) body += ` (${fm.realName})`
  body += ` je rapper`
  if (fm.origin) body += ` z ${fm.origin}`
  body += `.`

  if (label) {
    body += ` Působí pod labelem **[${label.title}](/labely/${label.slug})**`
    if (label.location) body += ` (${label.location})`
    body += `.`
  }

  if (fm.description && fm.description.length > 10 && !fm.description.includes('rapper z') && !fm.description.includes('je rapper')) {
    body += ` ${fm.description}`
  }

  body += `\n`

  // Albums section
  if (albums.length > 0) {
    body += `\n### Diskografie\n\n| Album | Rok | Poznámka |\n|:---|:---|:---|\n`
    for (const a of albums.slice(0, 8)) {
      body += `| **[${a.title}](/alba/${a.slug})** | ${a.year || '—'} | ${a.genre || '—'} |\n`
    }
  }

  // Tracks section
  if (tracks.length > 0) {
    body += `\n### Skladby\n\n`
    for (const t of tracks.slice(0, 6)) {
      body += `- **[${t.title}](/skladby/${t.slug})**${t.year ? ` (${t.year})` : ''}`
      if (t.features.length > 0) body += ` — feat. ${t.features.join(', ')}`
      body += `\n`
    }
  }

  // Label info
  if (label) {
    body += `\n### Label\n\n**[${label.title}](/labely/${label.slug})**`
    if (label.founded) body += ` — založen ${label.founded}`
    if (label.location) body += `, ${label.location}`
    body += `.\n`
  }

  // Style
  if (fm.genre && fm.genre.length > 0) {
    body += `\n### Styl\n\n${title} se specializuje na **${fm.genre.join(', ')}**.\n`
  }

  // Note if minimal data
  if (albums.length === 0 && tracks.length === 0 && !label) {
    body += `\n> **Poznámka:** Pro tohoto interpreta bylo nalezeno jen minimum lokálních dat. Profil byl doplněn z dostupných frontmatter polí. Pro kompletní rozpracování je potřeba externí research.\n`
  }

  // Write
  const newText = text.replace(/^(---\n[\s\S]*?\n---)([\s\S]*)$/, `$1${body}`)
  writeFileSync(filePath, newText)

  // Add relatedRappers from features
  const relatedFromTracks = new Set()
  for (const t of tracks) {
    for (const f of t.features) {
      const fSlug = f.toLowerCase().replace(/\s+/g, '-')
      if (fSlug !== slug && fSlug.length > 2) relatedFromTracks.add(fSlug)
    }
  }
  const allRelated = [...(fm.relatedRappers || []), ...relatedFromTracks]
  const uniqueRelated = [...new Set(allRelated)].slice(0, 5)

  if (uniqueRelated.length > 0 && !fm.relatedRappers) {
    let updated = newText.replace(
      /^(---\n[\s\S]*?)(---\n)/,
      `$1relatedRappers:\n${uniqueRelated.map(r => `  - "${r}"`).join('\n')}\n$2`
    )
    writeFileSync(filePath, updated)
  }

  console.log(`✅ ${albums.length} alb, ${tracks.length} skladeb${label ? ', label: ' + label.title : ''}`)
  return { success: true, slug, title, albums: albums.length, tracks: tracks.length }
}

// ─── Main ────────────────────────────────────────────────────

function findGenericRappers() {
  const generic = []
  for (const file of getMdxFiles(RAPERI_DIR)) {
    const text = readFileSync(file, 'utf-8')
    const body = getBody(text)
    const bodySize = Buffer.byteLength(body, 'utf8')
    const slug = basename(file, '.mdx')
    const isSkipped = !FORCE_MODE && text.includes('<!-- auto-enhance: skipped -->')

    if (isSkipped) continue

    if (bodySize < 150 || body.includes('rapper z') || body.includes('je rapper') || body.includes('působící na české rapové scéně') || body.includes('je český rapper')) {
      generic.push({ file, slug, bodySize, title: parseFrontmatter(text).title || slug })
    }
  }
  return generic.sort((a, b) => a.bodySize - b.bodySize)
}

function gitCheckpoint(message) {
  try {
    execSync('git add -A', { stdio: 'pipe' })
    execSync(`git commit -m "${message}"`, { stdio: 'pipe' })
    return true
  } catch (e) {
    return false
  }
}

function logEntry(entry) {
  const timestamp = new Date().toISOString()
  const line = `\n### ${timestamp}\n\n- **${entry.title}** (${entry.slug})\n- Status: ${entry.success ? '✅ Vylepšeno' : '⏭️ Odloženo'}\n${entry.reason ? `- Důvod: ${entry.reason}\n` : ''}${entry.albums !== undefined ? `- Alba: ${entry.albums}, Skladby: ${entry.tracks}\n` : ''}---\n`
  appendFileSync(LOG_FILE, line)
}

function main() {
  if (!existsSync(LOG_FILE)) {
    writeFileSync(LOG_FILE, '# Auto-enhance log\n\n*Automatický proces vylepšování rapper profilů z lokálních dat.*\n*Pouze ověřená fakta — žádné vymyšlené informace.*\n*Pokud nedostatek dat → odloženo, důvod logován.*\n*Nic se nepushuje na GitHub.*\n')
  }

  const generic = findGenericRappers()

  if (generic.length === 0) {
    console.log('🎉 Všechny rapper profily jsou vylepšeny.')
    process.exit(0)
  }

  const target = generic[0]
  console.log(`📋 Zbývá ${generic.length} generických profilů`)
  console.log(`🎯 ${target.title} (body: ${target.bodySize}B)`)

  const result = enhanceRapper(target.file)
  logEntry(result)

  if (result.success) {
    const commitMsg = `${CHECKPOINT_PREFIX} ${result.title} — ${result.albums} alb, ${result.tracks} skladeb`
    const committed = gitCheckpoint(commitMsg)
    if (committed) {
      console.log(`💾 Checkpoint: ${commitMsg}`)
    }
  } else {
    // Mark as skipped
    const text = readFileSync(target.file, 'utf-8')
    if (!text.includes('<!-- auto-enhance: skipped -->')) {
      writeFileSync(target.file, text + '\n<!-- auto-enhance: skipped -->\n')
      gitCheckpoint(`${CHECKPOINT_PREFIX} SKIP ${result.title}`)
    }
  }
}

main()
