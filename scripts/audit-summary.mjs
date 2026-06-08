#!/usr/bin/env node
// audit-summary.mjs — stručnej přehled toho, co je třeba
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function audit(name) {
  const dir = join(root, 'content', name)
  const files = readdirSync(dir).filter(f => f.endsWith('.mdx'))
  const data = { total: files.length, tiny: [], thin: [], missingGenre: [], missingPublished: [] }

  for (const file of files) {
    const path = join(dir, file)
    const content = readFileSync(path, 'utf8')
    const slug = file.replace('.mdx', '')
    const len = Buffer.byteLength(content, 'utf8')

    if (len < 200) data.tiny.push(slug)
    else if (len < 500) data.thin.push(slug)

    if (!content.includes('genre:')) data.missingGenre.push(slug)
    if (!content.includes('publishedAt:')) data.missingPublished.push(slug)
  }

  console.log(`\n=== ${name.toUpperCase()} (${data.total}) ===`)
  if (data.tiny.length) console.log(`  ❌ Tiny (<200B): ${data.tiny.length}`)
  if (data.thin.length) console.log(`  ⚠️  Thin (200-500B): ${data.thin.length}`)
  if (data.missingGenre.length) console.log(`  ❌ Chybí genre: ${data.missingGenre.length} — ${data.missingGenre.join(', ')}`)
  if (data.missingPublished.length) console.log(`  ❌ Chybí publishedAt: ${data.missingPublished.length} — ${data.missingPublished.join(', ')}`)
  if (!data.tiny.length && !data.thin.length && !data.missingGenre.length && !data.missingPublished.length) console.log(`  ✅ Všechno OK`)
  return data
}

const results = {}
for (const name of ['raperi', 'alba', 'zanry', 'labely', 'clanky', 'skladby']) {
  results[name] = audit(name)
}

console.log('\n═══════════════════════════════════════')
console.log('CO JE TŘEBA UDĚLAT (prioritně)')
console.log('═══════════════════════════════════════')

const todo = []

// 1. Rapeři bez genre + publishedAt
if (results.raperi.missingGenre.length) {
  todo.push(`🔴 Doplnit genre a publishedAt k ${results.raperi.missingGenre.length} rapperům: ${results.raperi.missingGenre.join(', ')}`)
}

// 2. Thin raperi
if (results.raperi.thin.length) {
  todo.push(`🟡 Rozšířit ${results.raperi.thin.length} tenkých rapperů: ${results.raperi.thin.join(', ')}`)
}

// 3. Thin alba
if (results.alba.thin.length) {
  todo.push(`🟡 Rozšířit ${results.alba.thin.length} tenkých alb`)
}

// 4. Thin labely
if (results.labely.thin.length) {
  todo.push(`🟡 Rozšířit ${results.labely.thin.length} tenkých labelů: ${results.labely.thin.join(', ')}`)
}

// 5. Tiny skladby
const tinySkladby = results.skladby.tiny.length
const thinSkladby = results.skladby.thin.length
if (tinySkladby || thinSkladby) {
  todo.push(`🟡 ${tinySkladby} skladeb <200B, ${thinSkladby} skladeb <500B (generované z Deezeru, čeká na doplnění)`)
}

todo.forEach((t, i) => console.log(`\n${i+1}. ${t}`))

console.log(`\n📊 CELKEM: ${results.raperi.total + results.alba.total + results.zanry.total + results.labely.total + results.clanky.total + results.skladby.total} dokumentů`)