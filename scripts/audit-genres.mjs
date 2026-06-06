import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const dirs = ['content/raperi', 'content/alba', 'content/skladby']
const slugToTitle = {}
const genreSet = new Set()

// Read existing zanry
for (const f of readdirSync('content/zanry')) {
  if (!f.endsWith('.mdx')) continue
  const content = readFileSync(join('content/zanry', f), 'utf-8')
  const slug = f.replace('.mdx', '')
  const tm = content.match(/^title:\s*"(.+?)"/m)
  slugToTitle[slug] = tm ? tm[1] : slug
}

for (const dir of dirs) {
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mdx')) continue
    const content = readFileSync(join(dir, f), 'utf-8')
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) continue
    const fm = fmMatch[1]

    // Multiline YAML: genre:\n  - "x"\n  - "y"
    const mlMatch = fm.match(/^genre:\s*\n([\s\S]*?)(?=^[a-z])/m)
    if (mlMatch) {
      for (const m of mlMatch[1].matchAll(/-\s*"([^"]+)"/g)) {
        genreSet.add(m[1])
      }
      continue
    }

    // Inline array: genre: ["x", "y"]
    const ilMatch = fm.match(/^genre:\s*\[(.*)]/m)
    if (ilMatch) {
      for (let v of ilMatch[1].split(',')) {
        v = v.trim().replace(/^["']|["']$/g, '')
        if (v) genreSet.add(v)
      }
      continue
    }

    // Single string: genre: "x"
    const sMatch = fm.match(/^genre:\s*"([^"]+)"/m)
    if (sMatch) genreSet.add(sMatch[1])
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const sorted = [...genreSet].sort()
console.log('=== VSECHNY ZANRY V CONTENTU ===')
let missing = 0
for (const g of sorted) {
  const slug = slugify(g)
  const has = slugToTitle[slug] ? '✅' : '❌'
  if (!slugToTitle[slug]) missing++
  console.log(`${has} ${g.padEnd(25)} /zanry/${slug}`)
}
console.log(`\nChybi: ${missing} z ${sorted.length}`)
console.log(`Existujicich stranek: ${Object.keys(slugToTitle).length}`)
