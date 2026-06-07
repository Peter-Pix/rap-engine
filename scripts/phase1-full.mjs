#!/usr/bin/env node
/**
 * phase1-full.mjs — Phase 1 full: promote meta.*, strip useless fields, fix types
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { load, dump } from 'js-yaml'
import path from 'path'

function getMdxFiles(dir) {
  const files = []
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isFile() && full.endsWith('.mdx')) files.push(full)
  }
  return files
}

// ⚠️ SCHEMAS must match contentlayer.config.ts field definitions!
// Last synced: 2026-06-07
const SCHEMAS = {
  raperi: new Set(['title','slug','realName','born','birthPlace','active','label','genre','description','image','featured','publishedAt','updatedAt','relatedRappers','relatedAlbums','deezerId','socials','aliases','origin','hometown','labels','subgenres','status','associatedActs','activeSince','seo','entityType','crew','spotify','city','summary','birthDate','memberOf']),
  alba: new Set(['title','slug','rapper','rapperSlug','label','labelSlug','year','genre','description','image','featured','tracklist','rating','publishedAt','updatedAt','deezerAlbumId','upc','origin','releaseType','features','featuresNames','producers','producersNames','duration','explicit','releaseDate','nbTracks','subgenres','labelName','cover','aliases','activeSince','artist','summary']),
  labely: new Set(['title','slug','founded','location','description','image','artists','publishedAt','website','city','country','founder','genre','members','entityType','updatedAt','summary']),
  zanry: new Set(['title','slug','description','image','featured','publishedAt','updatedAt','color','aliases','relatedGenres']),
}

// ⚠️ DO NOT strip fields that contentlayer schema accepts as optional
// `type` is a reserved contentlayer2 keyword — must be removed everywhere
// `summary`, `hasLongform`, `birthDate` are now valid contentlayer fields
const STRIP = new Set(['id', 'kind', 'seo', 'type'])

function getEntityType(filepath) {
  for (const p of filepath.split('/')) {
    if (SCHEMAS[p]) return p
  }
  return null
}

// Get all files
const files = []
for (const dir of ['content/raperi', 'content/alba', 'content/labely', 'content/zanry']) {
  files.push(...getMdxFiles(dir))
}
console.log(`Found ${files.length} MDX files`)

let fixed = 0

for (const filepath of files) {
  let text = readFileSync(filepath, 'utf8')
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  
  // Find frontmatter
  let fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    // Maybe no closing ---, fix
    const d = text.indexOf('---')
    if (d === 0) {
      const h = text.indexOf('## ')
      if (h > 3) {
        text = text.slice(0, h) + '---\n' + text.slice(h)
        fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/)
      }
    }
  }
  if (!fmMatch) {
    console.log(`  ⚠️ Skipping ${path.basename(filepath)}`)
    continue
  }
  
  const fmStr = fmMatch[1]
  const body = text.slice(fmMatch[0].length)
  const entityType = getEntityType(filepath)
  const safe = entityType ? SCHEMAS[entityType] : null
  
  // Parse YAML
  let parsed
  try {
    parsed = load(fmStr)
  } catch(e) {
    console.log(`  ❌ YAML parse: ${path.basename(filepath)}: ${e.message.slice(0, 60)}`)
    continue
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.log(`  ⚠️ Not dict: ${path.basename(filepath)}`)
    continue
  }
  
  // 1. Promote meta.*
  const meta = parsed.meta
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const MAP = {
      deezerId: 'deezerId', socials: 'socials', image: 'image',
      realName: 'realName', birthPlace: 'birthPlace', birthDate: 'born',
      labels: 'labels', genres: 'subgenres', city: 'hometown',
      origin: 'origin', status: 'status', associatedActs: 'associatedActs',
      activeSince: 'activeSince', subgenres: 'subgenres', aliases: 'aliases',
    }
    for (const [mk, tk] of Object.entries(MAP)) {
      if (meta[mk] !== undefined && parsed[tk] === undefined) parsed[tk] = meta[mk]
    }
    if (meta.producers !== undefined && parsed.producers === undefined && entityType === 'alba') parsed.producers = meta.producers
    if (meta.features !== undefined && parsed.features === undefined && entityType === 'alba') parsed.features = meta.features
    delete parsed.meta
  }
  
  // 2. Strip useless
  for (const k of STRIP) delete parsed[k]
  
  // 3. Fix types
  if (parsed.origin !== undefined) {
    if (typeof parsed.origin === 'object' && !Array.isArray(parsed.origin))
      parsed.origin = Object.values(parsed.origin).filter(Boolean).join(', ')
    if (Array.isArray(parsed.origin))
      parsed.origin = parsed.origin.join(', ')
  }
  if (parsed.activeSince !== undefined && typeof parsed.activeSince === 'number')
    parsed.activeSince = String(parsed.activeSince)
  
  // 4. Remove non-schema fields
  const removed = []
  if (safe) {
    for (const k of Object.keys(parsed)) {
      if (!safe.has(k)) { removed.push(k); delete parsed[k] }
    }
  }
  
  // 5. Order by schema
  const ordered = {}
  if (safe) {
    for (const k of safe) { if (parsed[k] !== undefined) ordered[k] = parsed[k] }
    for (const [k, v] of Object.entries(parsed)) { if (ordered[k] === undefined) ordered[k] = v }
  } else {
    Object.assign(ordered, parsed)
  }
  
  // Write
  const newFm = dump(ordered, { indent: 2, lineWidth: 120, noRefs: true, quotingType: '"', forceQuotes: true, sortKeys: false })
  writeFileSync(filepath, `---\n${newFm.trim()}\n---${body}`, 'utf8')
  
  const log = []
  if (removed.length) log.push(`removed: ${removed.join(', ')}`)
  if (meta && Object.keys(meta).length) log.push('promoted meta')
  console.log(`✅ ${path.basename(filepath)} — ${log.join(', ') || 'cleaned'}`)
  fixed++
}

console.log(`\n🎯 Fixed ${fixed} files!`)