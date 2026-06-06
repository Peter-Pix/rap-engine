/**
 * consolidate-cashanova.mjs
 * Sloučí dva profily pro stejného rappera:
 *   - ca-hanova-bulhar.mdx (stub) — smaže se
 *   - cashanova-bulhar.mdx (plný profil) — přejmenuje se, slug změní na ca-hanova-bulhar
 * Fixne reference v ostatních MDX souborech
 * Regeneruje interlinking.ts
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = '/Users/petrpiskacek/.openclaw/workspace/Project_1/rap-engine-second-trial'
const RAPERI = join(ROOT, 'content', 'raperi')

const STUB_FILE = join(RAPERI, 'ca-hanova-bulhar.mdx')
const FULL_FILE = join(RAPERI, 'cashanova-bulhar.mdx')
const TARGET_FILE = join(RAPERI, 'ca-hanova-bulhar.mdx')

// ─── Step 1: Přečti plný profil a uprav frontmatter ───
console.log('📖 Čtu plný profil cashanova-bulhar.mdx...')
let fullContent = readFileSync(FULL_FILE, 'utf-8')

// Změň slug: "cashanova-bulhar" → "ca-hanova-bulhar"
fullContent = fullContent.replace(
  /slug:\s*"cashanova-bulhar"/,
  'slug: "ca-hanova-bulhar"'
)

// Ujisti, že title je správný
fullContent = fullContent.replace(
  /title:\s*"Cashanova Bulhar"/,
  'title: "CA\$HANOVA BULHAR"'
)

// Přidej aliases (pokud ještě neexistuje)
if (!fullContent.includes('aliases:')) {
  fullContent = fullContent.replace(
    /(\bfeatured:\s*(?:true|false)\s*\n)/,
    '$1aliases:\n  - "Cashanova Bulhar"\n  - "Matěj Kratejl"\n'
  )
}

// ─── Step 2: Smaž starý stub ───
console.log('🗑️  Mažu stub ca-hanova-bulhar.mdx...')
unlinkSync(STUB_FILE)

// Smaž starý full file
console.log('🗑️  Mažu starý cashanova-bulhar.mdx...')
unlinkSync(FULL_FILE)

// ─── Step 3: Napiš nový konsolidovaný profil ───
console.log('✍️  Píšu konsolidovaný profil ca-hanova-bulhar.mdx...')
writeFileSync(TARGET_FILE, fullContent, 'utf-8')

// ─── Step 4: Fixni reference v ostatních souborech ───
const REFERENCE_FIXES = [
  join(RAPERI, 'dollar-prync.mdx'),
  join(RAPERI, 'pain.mdx'),
  join(ROOT, 'content', 'labely', 'dvojlitrboyzz.mdx'),
]

for (const filepath of REFERENCE_FIXES) {
  if (!existsSync(filepath)) continue
  let content = readFileSync(filepath, 'utf-8')
  const oldContent = content
  content = content.replace(/cashanova-bulhar/g, 'ca-hanova-bulhar')
  if (content !== oldContent) {
    console.log(`🔄 Fixnuto: ${filepath.replace(ROOT, '')}`)
    writeFileSync(filepath, content, 'utf-8')
  }
}

// ─── Step 5: Regeneruj interlinking.ts ───
console.log('🔄 Regeneruji interlinking.ts...')
try {
  execSync('node scripts/generate-registry.mjs', { cwd: ROOT, stdio: 'pipe', timeout: 30000 })
  console.log('✅ interlinking.ts regenerován')
} catch (e) {
  console.error('❌ Chyba při regeneraci interlinking.ts:', e.message)
}

console.log('\n✅ Konsolidace dokončena!')
console.log('   ca-hanova-bulhar.mdx — jediný profil s aliasy [Cashanova Bulhar, Matěj Kratejl]')
console.log('   cashanova-bulhar.mdx — smazán')
console.log('   Reference opraveny v: dollar-prync, pain, dvojlitrboyzz')
