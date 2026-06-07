#!/usr/bin/env node
/**
 * fix-tracklist-yaml.mjs — opraví rozbitý YAML v tracklistech (chybějící pomlčky)
 *
 * Před:
 *   tracklist:
 *     "Podzim bro",
 *     "Facelift",
 *
 * Po:
 *   tracklist:
 *     - "Podzim bro"
 *     - "Facelift"
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = resolve(process.argv[1] ? join(process.argv[1], '..', '..') : '.')
const DIR = join(ROOT, 'content/alba')
const DRY = process.argv.includes('--dry-run')

const files = readdirSync(DIR).filter(f => f.endsWith('.mdx'))
let fixed = 0

for (const file of files) {
  const p = join(DIR, file)
  let content = readFileSync(p, 'utf8')

  // Find tracklist block and fix line-by-line
  let inTracklist = false
  const lines = content.split('\n')
  let modified = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^(tracklist|relatedAlbums|relatedRappers|features|producers|genre|aliases|labels):\s*$/)) {
      inTracklist = true
      continue
    }
    if (inTracklist) {
      // Konec YAML bloku — další top-level field
      if (line.match(/^[a-z][a-zA-Z]*:/) && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('-')) {
        inTracklist = false
        continue
      }
      // Oprav jen tracklist, ne jiné seznamy — jsou už v pořádku?
      // Jen pro jistotu opravíme libovolný "string", co nemá pomlčku
      const m = line.match(/^(\s+)"([^"]+)",?\s*$/)
      if (m) {
        lines[i] = `${m[1]}- "${m[2]}"`
        modified = true
      }
    }
  }

  if (modified) {
    if (!DRY) {
      writeFileSync(p, lines.join('\n'), 'utf8')
    }
    console.log(`${DRY ? '[dry] ' : ''}✓ ${file}`)
    fixed++
  }
}

console.log(`\n${DRY ? '[DRY RUN] ' : ''}Opraveno: ${fixed} souborů`)
