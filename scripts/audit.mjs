#!/usr/bin/env node
// audit.mjs — co chybí, co je slabý
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function auditDir(name) {
  const dir = join(root, 'content', name)
  const files = readdirSync(dir).filter(f => f.endsWith('.mdx'))
  const results = { total: files.length, tiny: [], missingFields: [], thin: [] }

  for (const file of files) {
    const path = join(dir, file)
    const content = readFileSync(path, 'utf8')
    const slug = file.replace('.mdx', '')
    const bytes = Buffer.byteLength(content, 'utf8')

    // Tiny: under 200 bytes (just frontmatter + few words)
    if (bytes < 300) {
      results.tiny.push({ slug, bytes })
    }

    // Check key fields
    if (name === 'raperi') {
      if (!content.includes('description:')) results.missingFields.push({ slug, field: 'description' })
      if (!content.includes('genre:')) results.missingFields.push({ slug, field: 'genre' })
      if (!content.includes('publishedAt:')) results.missingFields.push({ slug, field: 'publishedAt' })
    }
    if (name === 'alba') {
      if (!content.includes('year:')) results.missingFields.push({ slug, field: 'year' })
      if (!content.includes('rapper:')) results.missingFields.push({ slug, field: 'rapper' })
    }

    // Thin: under 500 bytes (barely any content)
    if (bytes < 500 && bytes >= 300) {
      results.thin.push({ slug, bytes })
    }
  }

  return results
}

for (const name of ['raperi', 'alba', 'zanry', 'labely', 'clanky', 'skladby']) {
  const r = auditDir(name)
  console.log(`\n=== ${name.toUpperCase()} (${r.total}) ===`)
  if (r.tiny.length) console.log(`  ❌ Tiny (<300B): ${r.tiny.map(x => x.slug).join(', ')}`)
  if (r.thin.length) console.log(`  ⚠️  Thin (300-500B): ${r.thin.map(x => x.slug).join(', ')}`)
  if (r.missingFields.length) console.log(`  ⚠️  Missing fields: ${r.missingFields.map(x => `${x.slug} (${x.field})`).join(', ')}`)
  if (!r.tiny.length && !r.thin.length && !r.missingFields.length) console.log(`  ✅ All good`)
}

// Bonus: find duplicit slugs
console.log('\n=== DUPLICITY ===')
const allSlugs = {}
for (const name of ['raperi', 'alba', 'zanry', 'labely', 'clanky', 'skladby']) {
  const dir = join(root, 'content', name)
  try {
    for (const f of readdirSync(dir)) {
      const slug = f.replace('.mdx', '').replace('.mdx3', '')
      allSlugs[slug] = allSlugs[slug] || []
      allSlugs[slug].push(name)
    }
  } catch (e) {}
}
for (const [slug, types] of Object.entries(allSlugs)) {
  if (types.length > 1) console.log(`  ❌ "${slug}" exists in: ${types.join(', ')}`)
}

// Bonus: build warnings from last build
console.log('\n=== BUILD METRICS ===')
console.log(`  Rapoři:      ${readdirSync(join(root, 'content/raperi')).filter(f => f.endsWith('.mdx')).length}`)
console.log(`  Alba:        ${readdirSync(join(root, 'content/alba')).filter(f => f.endsWith('.mdx')).length}`)
console.log(`  Žánry:       ${readdirSync(join(root, 'content/zanry')).filter(f => f.endsWith('.mdx')).length}`)
console.log(`  Labely:      ${readdirSync(join(root, 'content/labely')).filter(f => f.endsWith('.mdx')).length}`)
console.log(`  Články:      ${readdirSync(join(root, 'content/clanky')).filter(f => f.endsWith('.mdx')).length}`)
console.log(`  Skladby:     ${readdirSync(join(root, 'content/skladby')).filter(f => f.endsWith('.mdx')).length}`)
console.log(`  Celkem:      ${readdirSync(join(root, 'content/raperi')).filter(f => f.endsWith('.mdx')).length + readdirSync(join(root, 'content/alba')).filter(f => f.endsWith('.mdx')).length + readdirSync(join(root, 'content/zanry')).filter(f => f.endsWith('.mdx')).length + readdirSync(join(root, 'content/labely')).filter(f => f.endsWith('.mdx')).length + readdirSync(join(root, 'content/clanky')).filter(f => f.endsWith('.mdx')).length + readdirSync(join(root, 'content/skladby')).filter(f => f.endsWith('.mdx')).length}`)