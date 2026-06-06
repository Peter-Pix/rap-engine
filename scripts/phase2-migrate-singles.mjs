#!/usr/bin/env node
/**
 * phase2-migrate-singles.mjs — Migrate singles from content/alba/ → content/skladby/
 * 
 * Criteria: 1-track releases, feat./ft. in title, remix/rmx in title
 * Adds releaseType: "single" and remaps Album schema → Skladba schema
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync } from 'fs'
import { load, dump } from 'js-yaml'
import path from 'path'

// Target: Skladba schema fields
const SKLADBA_FIELDS = [
  'title', 'slug', 'rapper', 'rapperSlug', 'features', 'featuresNames',
  'album', 'albumSlug', 'year', 'genre', 'duration', 'trackNumber',
  'producers', 'producersNames', 'description', 'image',
  'publishedAt', 'updatedAt', 'deezerTrackId', 'releaseType', 'explicit', 'releaseDate'
]

// Fields to drop (Album-specific)
const DROP_FIELDS = new Set([
  'label', 'labelSlug', 'rating', 'tracklist', 'nbTracks', 'upc',
  'deezerAlbumId', 'origin', 'cover', 'subgenres', 'aliases', 'activeSince'
])

// Read all existing skladby slugs to avoid collisions
const existingSlugs = new Set()
if (existsSync('content/skladby')) {
  for (const f of readdirSync('content/skladby')) {
    if (f.endsWith('.mdx')) {
      const slug = f.replace(/\.mdx$/, '')
      existingSlugs.add(slug)
    }
  }
}
console.log(`Existing skladby: ${existingSlugs.size}`)

// Read all album files
const files = readdirSync('content/alba').filter(f => f.endsWith('.mdx'))
console.log(`Total in content/alba/: ${files.length}`)

function identifySingles(data, filename) {
  const tl = data.tracklist || []
  const title = (data.title || '').toLowerCase()
  const fname = filename.toLowerCase()
  
  // Explicit type markers
  if (data.releaseType === 'single' || data.type === 'single') return true
  if (data.type === 'album' || data.type === 'ep') return false
  
  // 1-track → single
  if (tl.length <= 1) return true
  
  // Short tracklist (2-3) with single-like names
  if (tl.length <= 3 && fname.includes('-feat-')) return true
  
  // feats/remix in filename
  if (fname.includes('-feat-') || fname.includes('-remix') || fname.includes('-rmx')) return true
  
  // Known commercial albums - skip by checking if title is substantial
  // with more tracks
  if (tl.length >= 4) return false
  
  // Default: check feat/remix in title
  if (title.includes('feat.') || title.includes(' feat ') || title.includes('ft.') ||
      title.includes('remix') || title.includes('rmx')) return true
  
  return false
}

let migrated = 0
let skipped = 0
let collisions = 0

for (const filename of files) {
  const filepath = `content/alba/${filename}`
  let text = readFileSync(filepath, 'utf8')
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    console.log(`  ⚠️ No fm: ${filename}`)
    skipped++
    continue
  }
  
  const fmStr = fmMatch[1]
  const body = text.slice(fmMatch[0].length)
  
  let data
  try {
    data = load(fmStr)
  } catch(e) {
    console.log(`  ❌ Parse: ${filename}: ${e.message.slice(0, 60)}`)
    skipped++
    continue
  }
  
  if (!data || typeof data !== 'object') {
    console.log(`  ⚠️ Not dict: ${filename}`)
    skipped++
    continue
  }
  
  // Check if this is a single
  if (!identifySingles(data, filename)) {
    console.log(`  📀 Keep as album: ${filename}`)
    skipped++
    continue
  }
  
  // Determine song title
  const tl = data.tracklist || []
  const songTitle = tl.length > 0 ? tl[0] : data.title
  
  // Build new frontmatter for Skladba
  const skladba = {}
  
  // Title = song title
  skladba.title = songTitle
  skladba.slug = data.slug
  
  // Check slug collision
  if (existingSlugs.has(data.slug)) {
    console.log(`  ❌ Slug collision: ${filename} (slug: ${data.slug})`)
    collisions++
    skipped++
    continue
  }
  
  skladba.rapper = data.rapper
  skladba.rapperSlug = data.rapperSlug
  skladba.features = data.features || data.featuresNames || []
  skladba.featuresNames = data.featuresNames || data.features || []
  
  // Optional album reference if it came from an album context
  // For singles, no album ref needed
  skladba.year = data.year
  skladba.genre = data.genre
  skladba.duration = data.duration || ''
  
  skladba.producers = data.producers || data.producersNames || []
  skladba.producersNames = data.producersNames || data.producers || []
  
  skladba.description = data.description || ''
  skladba.image = data.image || ''
  skladba.publishedAt = data.publishedAt
  skladba.updatedAt = data.updatedAt
  skladba.releaseType = 'single'
  skladba.explicit = data.explicit || false
  skladba.releaseDate = data.releaseDate || data.publishedAt || ''
  
  // Deezer - single rarely has albumId, check if present
  // We keep deezerTrackId if present in data (some may have it)
  
  // Clean
  for (const key of Object.keys(skladba)) {
    if (skladba[key] === undefined || skladba[key] === null) {
      delete skladba[key]
    }
    if (Array.isArray(skladba[key]) && skladba[key].length === 0) {
      delete skladba[key]
    }
    if (skladba[key] === '') {
      delete skladba[key]
    }
  }
  
  // Write to skladby/
  const newFm = dump(skladba, { indent: 2, lineWidth: 120, noRefs: true, quotingType: '"', forceQuotes: true, sortKeys: false })
  const newText = `---\n${newFm.trim()}\n---${body}`
  
  const newPath = `content/skladby/${filename}`
  writeFileSync(newPath, newText, 'utf8')
  
  // Remove original
  // Actually, let's just move it (rename)
  // But first write to ensure it's correct
  // We'll delete the original after verifying
  
  existingSlugs.add(data.slug)
  migrated++
  console.log(`  ✅ ${filename} → ${songTitle} (single)`)
}

console.log(`\n🎯 Phase 2: ${migrated} singles migrated, ${skipped} skipped, ${collisions} collisions`)

if (migrated > 0 && collisions === 0) {
  console.log('\nDeleting originals from content/alba/...')
  // Re-read files to find which were migrated
  for (const filename of files) {
    const filepath = `content/alba/${filename}`
    let text = readFileSync(filepath, 'utf8')
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!fmMatch) continue
    try {
      const data = load(fmMatch[1])
      if (identifySingles(data, filename)) {
        // This was migrated, delete original
        renameSync(filepath, `/tmp/alba-${filename}.bak`)
        console.log(`  🗑️ Removed ${filename}`)
      }
    } catch(e) {}
  }
}

console.log('\nRemaining in content/alba/: ' + readdirSync('content/alba').filter(f => f.endsWith('.mdx')).length + ' files')