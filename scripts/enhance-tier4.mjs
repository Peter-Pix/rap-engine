#!/usr/bin/env node

/**
 * enhance-tier4.mjs
 * 
 * Pro Tier 4 rappers (82 profilů s krátkým description) rozšíří description
 * na 120-150 znaků podle stylu z článků.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('/Users/petrpiskacek/.openclaw/workspace/Project_1/rap-engine-second-trial')
const RAPPERS_DIR = join(ROOT, 'content', 'raperi')

// ─── Util: parse frontmatter ───
function parseFrontmatter(content) {
  const lines = content.split('\n')
  const frontmatter = {}
  let inFrontmatter = false
  let frontmatterLines = []

  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter
      if (!inFrontmatter) break
      continue
    }
    if (inFrontmatter) {
      frontmatterLines.push(line)
    }
  }

  for (const line of frontmatterLines) {
    const m = line.match(/^([a-zA-Z]+):\s*(.+)$/)
    if (!m) continue
    const key = m[1]
    let value = m[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key === 'genre' || key === 'relatedRappers' || key === 'relatedAlbums') {
      if (value.startsWith('[')) {
        try { frontmatter[key] = JSON.parse(value.replace(/'/g, '"')) } catch {}
      } else {
        frontmatter[key] = value.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      }
    } else {
      frontmatter[key] = value
    }
  }
  return frontmatter
}

// ─── Util: generate enhanced description ───
async function generateEnhancedDescription(rapper) {
  const prompt = `
Jsi ostřílený redaktor českého hip-hop magazínu. Tvůj úkol:

Rozšiř meta description pro profil rappera ${rapper.title} (${rapper.realName || 'neznámé jméno'}) na 120-150 znaků.

Pravidla:
- Délka: 120-150 znaků (včetně teček a mezer)
- Musí obsahovat: jméno, 1-2 klíčové fakty (label, hit, ocenění, žánr), 1-2 klíčová slova (scéna, žánr)
- Nesmí obsahovat: "je český rapper", "je známý", "je populární", "v současnosti"
- Musí končit tečkou nebo call-to-action (např. "Poslouchej na Spotify.")
- Styl: faktický, bez emocí, bez superlativů, bez "nejlepší"
- Čeština: spisovná, ale neformální, bez chyb
- Vycházej z aktuálního description: "${rapper.description}"

Příklad:
Aktuální: "58G je český rapper."
Rozšířené: "58G (Ondřej Hladký) je pražský rapper a producent, který se prosadil albem 58 Grapes a spolupracemi s Yzomandiasem a Nikem Tendem. Poslouchej na Spotify."

Fakta:
- Žánry: ${rapper.genre?.join(', ') || 'neuvedeno'}
- Label: ${rapper.label || 'nezávislý'}
- Aktivní: ${rapper.active || 'neuvedeno'}
- Hity/alba: ${rapper.relatedAlbums?.join(', ') || 'neuvedeno'}
- Spolupráce: ${rapper.relatedRappers?.join(', ') || 'neuvedeno'}

Vygeneruj pouze samotný description text, žádné komentáře.
`.trim()

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-large-3:675b:cloud',
        prompt,
        stream: false,
        options: { temperature: 0.3 }
      })
    })
    const data = await response.json()
    if (data.response) return data.response.trim()
  } catch (e) {
    console.warn('⚠️  LLM fallback:', e.message)
  }

  // Fallback: rozšíření ručně
  const fallback = `${rapper.title} (${rapper.realName || 'neznámé jméno'}) je ${rapper.genre?.[0] || 'český'} rapper ${rapper.label ? `z labelu ${rapper.label}` : 'nezávislý'}. ${rapper.relatedAlbums?.[0] ? `Známý z alba ${rapper.relatedAlbums[0]}.` : 'Poslouchej na Spotify.'}`
  return fallback.slice(0, 150)
}

// ─── Main ───
async function main() {
  console.log('📝 Tier 4 rappers — tiny description enhancer')
  console.log('='.repeat(50))

  const files = readdirSync(RAPPERS_DIR).filter(f => f.endsWith('.mdx'))
  let processed = 0
  let skipped = 0

  for (const file of files) {
    const slug = file.replace('.mdx', '')
    const filepath = join(RAPPERS_DIR, file)
    const content = readFileSync(filepath, 'utf8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter.title || !frontmatter.description) {
      skipped++
      continue
    }

    // Skip if description is already good
    if (frontmatter.description.length >= 100 && !frontmatter.description.includes('je český rapper')) {
      skipped++
      continue
    }

    console.log(`🔄 ${slug} — rozšiřuji description...`)
    const newDescription = await generateEnhancedDescription(frontmatter)

    // Replace description in frontmatter
    const lines = content.split('\n')
    let inFrontmatter = false
    let updated = false
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        inFrontmatter = !inFrontmatter
        continue
      }
      if (inFrontmatter && lines[i].startsWith('description:')) {
        lines[i] = `description: "${newDescription}"`
        updated = true
        break
      }
    }

    if (updated) {
      writeFileSync(filepath, lines.join('\n'), 'utf8')
      console.log(`✅ ${slug} — description rozšířena (${newDescription.length} znaků)`)
      console.log(`   → ${newDescription}`)
      processed++
    } else {
      console.log(`⚠️  ${slug} — description nenalezena`)
      skipped++
    }
  }

  console.log(`\n📊 Souhrn:`)
  console.log(`   Zpracováno: ${processed}`)
  console.log(`   Přeskočeno: ${skipped}`)
  console.log('\n📝 Hotovo!')
}

main().catch(console.error)