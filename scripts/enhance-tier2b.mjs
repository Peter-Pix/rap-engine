#!/usr/bin/env node

/**
 * enhance-tier2b.mjs
 * 
 * Pro Tier 2B rappers (89 méně známých umělců se stuby) přepíše bio na krátký faktický profil.
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

// ─── Util: generate short bio with LLM ───
async function generateShortBio(rapper) {
  const prompt = `
Jsi ostřílený redaktor českého hip-hop magazínu. Tvůj úkol:

Napiš krátký profil rappera ${rapper.title} (${rapper.realName || 'neznámé jméno'}) pro encyklopedii 4rap.cz.

Pravidla:
- Délka: 80-120 slov (1 odstavec)
- Styl: faktický, bez emocí, bez superlativů
- Obsah: kdo to je, odkud je, hlavní žánr/label, klíčová alba/hity, co ho odlišuje
- Čeština: spisovná, ale neformální, bez chyb
- Nesmí obsahovat: "je český rapper", "je známý", "je populární", "v současnosti"

Příklad:

Kato (Adam Svatoš) z Prago Union je básník, který si rap vzal jako médium. Jeho texty jsou temné, propracované a mají schopnost se vtisknout do ucha i do hlavy na dlouho po posledním refrénu. Od Chaozzu k Prago Union, od HDP k Nekorektum – jeho kariéra je příběhem hledání autenticity. Spolupracoval s DJ Skuplem, Champion Sound a Krotiteli Dechů. Jeho styl kombinuje boombap, jazz a melancholii.

Fakta:
- Žánry: ${rapper.genre?.join(', ') || 'neuvedeno'}
- Label: ${rapper.label || 'nezávislý'}
- Aktivní: ${rapper.active || 'neuvedeno'}
- Hity/alba: ${rapper.relatedAlbums?.join(', ') || 'neuvedeno'}
- Spolupráce: ${rapper.relatedRappers?.join(', ') || 'neuvedeno'}

Vygeneruj pouze samotný text bio, žádné komentáře.
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

  // Fallback: velmi krátká bio
  return `${rapper.title} (${rapper.realName || 'neznámé jméno'}) je ${rapper.genre?.[0] || 'český'} rapper ${rapper.label ? `z labelu ${rapper.label}` : 'nezávislý'}. ${rapper.relatedAlbums?.[0] ? `Známý z alba ${rapper.relatedAlbums[0]}.` : ''}`
}

// ─── Main ───
async function main() {
  console.log('🎤 Tier 2B rappers — short bio enhancer')
  console.log('='.repeat(50))

  const files = readdirSync(RAPPERS_DIR).filter(f => f.endsWith('.mdx'))
  let processed = 0
  let skipped = 0

  for (const file of files) {
    const slug = file.replace('.mdx', '')
    const filepath = join(RAPPERS_DIR, file)
    const content = readFileSync(filepath, 'utf8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter.title) {
      skipped++
      continue
    }

    // Check if bio is stub
    const hasStub = content.includes('## Bio') && content.includes('_Stub — doplnit._')
    if (!hasStub) {
      skipped++
      continue
    }

    console.log(`🔄 ${slug} — generuji bio...`)
    const newBio = await generateShortBio(frontmatter)

    // Replace bio section
    const lines = content.split('\n')
    let inBio = false
    let updated = false
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '## Bio') {
        inBio = true
        continue
      }
      if (inBio && lines[i].trim() === '_Stub — doplnit._') {
        lines[i] = newBio
        updated = true
        break
      }
    }

    if (updated) {
      writeFileSync(filepath, lines.join('\n'), 'utf8')
      console.log(`✅ ${slug} — bio aktualizována`)
      processed++
    } else {
      console.log(`⚠️  ${slug} — bio nenalezena`)
      skipped++
    }
  }

  console.log(`\n📊 Souhrn:`)
  console.log(`   Zpracováno: ${processed}`)
  console.log(`   Přeskočeno: ${skipped}`)
  console.log('\n🎤 Hotovo!')
}

main().catch(console.error)