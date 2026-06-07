#!/usr/bin/env node
/**
 * fix-yaml-clean.mjs — Fix broken YAML frontmatter using js-yaml
 * Rebuilds clean frontmatter with only schema-safe fields
 */

import { readFileSync, writeFileSync } from 'fs'
import { load, dump } from 'js-yaml'

const files = [
  'content/raperi/astral-one.mdx', 'content/raperi/astralkid22.mdx', 'content/raperi/badboy-berlin.mdx',
  'content/raperi/blako.mdx', 'content/raperi/bobby-blaze.mdx', 'content/raperi/dj-opia.mdx',
  'content/raperi/kamil-hoffmann.mdx', 'content/raperi/robin-zoot.mdx', 'content/raperi/tk27.mdx',
  'content/labely/rychli-kluci.mdx', 'content/labely/ty-nikdy.mdx', 'content/labely/znk.mdx',
  'content/raperi/alla-xul-elu.mdx', 'content/raperi/kvitek.mdx', 'content/raperi/dj-aka.mdx',
  'content/raperi/dj-fatte.mdx', 'content/raperi/jickson.mdx', 'content/raperi/samey.mdx',
  'content/alba/eskort.mdx',
]

// ⚠️ SCHEMAS must match contentlayer.config.ts field definitions!
// Last synced: 2026-06-07 — added entityType, crew, spotify, city, summary
const SCHEMAS = {
  raperi: new Set(['title','slug','realName','born','birthPlace','active','label','genre','description','image','featured','publishedAt','updatedAt','relatedRappers','relatedAlbums','deezerId','socials','aliases','origin','hometown','labels','subgenres','subgenre','status','associatedActs','activeSince','createdAt','seo','entityType','crew','spotify','city','summary','birthDate','memberOf']),
  alba: new Set(['title','slug','rapper','rapperSlug','label','labelSlug','year','genre','description','image','featured','tracklist','rating','publishedAt','updatedAt','deezerAlbumId','upc','origin','releaseType','features','featuresNames','producers','producersNames','duration','explicit','releaseDate','nbTracks','subgenres','labelName','cover','aliases','activeSince','artist','summary','rapper']),
  labely: new Set(['title','slug','founded','location','description','image','artists','publishedAt','website','city','country','founder','genre','members','entityType','updatedAt','summary','activeSince']),
}

for (const filepath of files) {
  // Read file
  let text = readFileSync(filepath, 'utf8')
  
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  
  // Extract frontmatter — match --- at start of string (even after BOM)
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    console.log(`  ⚠️ No frontmatter in ${filepath}`)
    continue
  }
  
  const fmStr = fmMatch[1]
  const body = text.slice(fmMatch[0].length)
  
  // Determine entity type from path
  const parts = filepath.split('/')
  const entityType = Object.keys(SCHEMAS).find(k => parts.includes(k))
  if (!entityType) {
    console.log(`  ? Unknown entity type: ${filepath}`)
    continue
  }
  
  const safeFields = SCHEMAS[entityType]
  
  // Try to parse as YAML
  let parsed
  try {
    parsed = load(fmStr)
  } catch (e) {
    // De-dent orphaned lines and retry
    const fixed = fmStr.split('\n')
      .map(line => {
        const stripped = line.trim()
        // De-dent lines that aren't valid list items or direct children
        if (stripped && line.startsWith('  ') && !stripped.startsWith('- ') && !stripped.startsWith('#')) {
          // Check if previous non-empty line is a parent key ending with :
          const prevLines = fixed.slice(0, -1)
          // Just strip it — we'll fix nesting by re-parsing
          return stripped
        }
        return line
      })
      .join('\n')
    
    try {
      parsed = load(fixed)
    } catch (e2) {
      console.log(`  ❌ YAML error in ${filepath}: ${e2.message.slice(0, 100)}`)
      continue
    }
  }
  
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.log(`  ⚠️ Not a dict in ${filepath}`)
    continue
  }
  
  // Filter to safe fields only
  const cleaned = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (safeFields.has(key)) {
      cleaned[key] = value
    }
  }
  
  // Fix type issues
  if (cleaned.origin !== undefined && typeof cleaned.origin === 'object' && !Array.isArray(cleaned.origin)) {
    // Dict → comma-separated string
    cleaned.origin = Object.values(cleaned.origin).join(', ')
  }
  if (Array.isArray(cleaned.origin)) {
    cleaned.origin = cleaned.origin.join(', ')
  }
  if (cleaned.activeSince !== undefined && typeof cleaned.activeSince === 'number') {
    cleaned.activeSince = String(cleaned.activeSince)
  }
  
  // Dump as clean YAML
  const newFm = dump(cleaned, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: true,
    sortKeys: false,
  })
  
  const newText = `---\n${newFm.trim()}\n---${body}`
  writeFileSync(filepath, newText, 'utf8')
  
  const removed = Object.keys(parsed).filter(k => !safeFields.has(k))
  console.log(`✅ ${filepath} — ${Object.keys(cleaned).length} fields${removed.length ? `, removed: ${removed.join(', ')}` : ''}`)
}

console.log('\n🎯 Done!')