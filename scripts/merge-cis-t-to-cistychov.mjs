#!/usr/bin/env node
/**
 * merge-cis-t-to-cistychov.mjs
 * Sloučí cis-t → cistychov ve všech MDX souborech
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

const REPLACEMENTS = [
  // Frontmatter rapperSlug
  { from: /rapperSlug:\s*"cis-t"/g, to: 'rapperSlug: "cistychov"' },
  { from: /rapperSlug:\s*'cis-t'/g, to: 'rapperSlug: "cistychov"' },
  // Interlinky v textu
  { from: /\[([^\]]*)\]\(\/raperi\/cis-t\)/g, to: '[$1](/raperi/cistychov)' },
  // Frontmatter rapper jméno (pokud existuje)
  { from: /rapper:\s*"Čis T"/g, to: 'rapper: "Čistychov"' },
  { from: /rapper:\s*'Čis T'/g, to: 'rapper: "Čistychov"' },
]

function getMdxFiles(dir) {
  const files = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (full.endsWith('.mdx')) {
        files.push(full)
      }
    }
  }
  walk(dir)
  return files
}

const contentDir = 'content'
const allFiles = getMdxFiles(contentDir)
let changed = 0

for (const file of allFiles) {
  const original = readFileSync(file, 'utf-8')
  let text = original
  let fileChanged = false

  for (const repl of REPLACEMENTS) {
    if (repl.from.test(text)) {
      text = text.replace(repl.from, repl.to)
      fileChanged = true
    }
  }

  if (fileChanged) {
    writeFileSync(file, text)
    console.log(`✅ ${file}`)
    changed++
  }
}

// Smazat cis-t.mdx
import { rmSync, existsSync } from 'fs'
const cisTFile = 'content/raperi/cis-t.mdx'
if (existsSync(cisTFile)) {
  rmSync(cisTFile)
  console.log(`🗑️  ${cisTFile} deleted`)
}

console.log(`\n📊 Total files changed: ${changed}`)
console.log(`📊 cis-t.mdx removed`)
