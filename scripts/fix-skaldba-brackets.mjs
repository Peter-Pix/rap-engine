#!/usr/bin/env node
/** Fix trailing "] v genre/tracklist položkách (nevalidní YAML) */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DIR = join(process.cwd(), 'content/skladby')
const DRY = process.argv.includes('--dry-run')
let cnt = 0

for (const f of readdirSync(DIR).filter(x => x.endsWith('.mdx'))) {
  const p = join(DIR, f)
  let s = readFileSync(p, 'utf8')
  
  // Vzorec:   - "value"]  na konci řádku  →   - "value"
  if (s.includes('"]')) {
    s = s.replace(/^(  - ".*")\]$/gm, '$1')
    cnt++
    if (!DRY) writeFileSync(p, s, 'utf8')
    console.log(`${DRY ? '[dry] ' : ''}✓ ${f}`)
  }
}
console.log(`\nOpraveno: ${cnt}`)
