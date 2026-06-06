#!/usr/bin/env node

/**
 * fix-tier3.mjs
 * 
 * Pro Tier 3 rappers (20 profilů s chybějícím publishedAt) doplní publishedAt
 * na základě aktivního období nebo alba.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('/Users/petrpiskacek/.openclaw/workspace/Project_1/rap-engine-second-trial')
const RAPPERS_DIR = join(ROOT, 'content', 'raperi')
const TIER_3_SLUGS = [
  '58g', 'alla-xul-elu', 'arleta', 'badboy-berlin', 'bobby-blaze',
  'd-kop', 'd-ritch', 'dj-aka', 'dj-fatte', 'dj-opia',
  'dj-wich', 'fobia-kid', 'fvck-kvlt', 'karlo', 'koukr',
  'kvitek', 'labello', 'morphius', 'robin-zoot', 'sofian-medjmedj'
]

// ─── Util: parse frontmatter ───
function parseFrontmatter(content) {
  const lines = content.split('\n')
  const frontmatter = {}
  let inFrontmatter = false
  let frontmatterLines = []

  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter
      if (!inFrontmatter) break
      continue
    }
    if (inFrontmatter) {
      frontmatterLines.push(line)
    }
  }

  for (const line of frontmatterLines) {
    const m = line.match(/^([a-zA-Z]+):\s*(.+)$/)
    if (!m) continue
    const key = m[1]
    let value = m[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }
  return frontmatter
}

// ─── Util: estimate publishedAt ───
function estimatePublishedAt(rapper) {
  if (rapper.publishedAt) return rapper.publishedAt
  
  // Use active period
  if (rapper.active) {
    const m = rapper.active.match(/(\d{4})/)
    if (m) return m[1] + '-01-01'
  }
  
  // Use related albums
  if (rapper.relatedAlbums && rapper.relatedAlbums.length > 0) {
    const album = rapper.relatedAlbums[0]
    if (album.match(/\d{4}/)) {
      const m = album.match(/(\d{4})/)
      if (m) return m[1] + '-01-01'
    }
  }
  
  // Fallback: use birth year + 18
  if (rapper.born) {
    const m = rapper.born.match(/(\d{4})/)
    if (m) return (parseInt(m[1]) + 18) + '-01-01'
  }
  
  // Default: 2010
  return '2010-01-01'
}

// ─── Main ───
function main() {
  console.log('📅 Tier 3 rappers — missing publishedAt fixer')
  console.log('='.repeat(50))

  for (const slug of TIER_3_SLUGS) {
    const filepath = join(RAPPERS_DIR, `${slug}.mdx`)
    if (!existsSync(filepath)) {
      console.log(`⚠️  ${slug} — soubor nenalezen`)
      continue
    }

    const content = readFileSync(filepath, 'utf8')
    const frontmatter = parseFrontmatter(content)

    if (frontmatter.publishedAt) {
      console.log(`✅ ${slug} — publishedAt již existuje (${frontmatter.publishedAt})`)
      continue
    }

    const estimated = estimatePublishedAt(frontmatter)
    console.log(`🔄 ${slug} — doplňuji publishedAt: ${estimated}`)

    // Replace in frontmatter
    const lines = content.split('\n')
    let inFrontmatter = false
    let updated = false
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        inFrontmatter = !inFrontmatter
        continue
      }
      if (inFrontmatter && lines[i].startsWith('publishedAt:')) {
        lines[i] = `publishedAt: "${estimated}"`
        updated = true
        break
      }
      // Add if missing
      if (inFrontmatter && !lines[i].startsWith('publishedAt:') && (lines[i].startsWith('---') || lines[i+1]?.trim() === '---')) {
        lines.splice(i+1, 0, `publishedAt: "${estimated}"`)
        updated = true
        break
      }
    }

    if (updated) {
      writeFileSync(filepath, lines.join('\n'), 'utf8')
      console.log(`✅ ${slug} — publishedAt doplněn`)
    } else {
      console.log(`⚠️  ${slug} — publishedAt nenalezeno`)
    }
  }

  console.log('\n📅 Hotovo!')
}

main()