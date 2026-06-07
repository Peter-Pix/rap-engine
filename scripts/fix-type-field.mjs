#!/usr/bin/env node
/** Fix reserved field name: type → entityType v content/raperi MDX souborech */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DIR = join(process.cwd(), 'content/raperi')
const DRY = process.argv.includes('--dry-run')

const files = readdirSync(DIR).filter(f => f.endsWith('.mdx'))
let cnt = 0

for (const f of files) {
  const p = join(DIR, f)
  let s = readFileSync(p, 'utf8')
  const re = /^type:\s*(.+)$/m
  if (re.test(s)) {
    s = s.replace(re, 'entityType: $1')
    cnt++
    if (!DRY) writeFileSync(p, s, 'utf8')
    console.log(`${DRY ? '[dry] ' : ''}✓ ${f}`)
  }
}
console.log(`\nOpraveno: ${cnt} souborů`)
