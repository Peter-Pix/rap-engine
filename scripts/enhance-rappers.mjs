#!/usr/bin/env node

/**
 * enhance-rappers.mjs
 * 
 * Pro Tier 1 rappers (15 profilů) přepíše `description:` na 150-160 znaků
 * podle stylu z článků (krátký, faktický, s CTA, bez "je český rapper").
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('/Users/petrpiskacek/.openclaw/workspace/Project_1/rap-engine-second-trial')
const RAPPERS_DIR = join(ROOT, 'content', 'raperi')
const TIER_1_SLUGS = [
  'ben-cristovao', 'yzomandias', 'nik-tendo', 'viktor-sheen', 'rytmus',
  'separ', 'pil-c', 'smack', 'ego', 'ektor', 'majk-spirit', 'lvcas-dope',
  'michajlov', 'refew', 'dms'
]

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

// ─── Util: generate description with LLM (fallback to local) ───
async function generateDescription(rapper) {
  const prompt = `
Jsi ostřílený redaktor českého hip-hop magazínu. Tvůj úkol:

Napiš meta description pro profil rappera ${rapper.title} (${rapper.realName || 'neznámé jméno'}).

Pravidla:
- Délka: 150-160 znaků (včetně teček a mezer)
- Musí obsahovat: jméno, 1-2 klíčové fakty (label, hit, ocenění, žánr), 1-2 klíčová slova (scéna, žánr)
- Nesmí obsahovat: "je český rapper", "je známý", "je populární"
- Musí končit tečkou nebo call-to-action (např. "Poslouchej na Spotify.")
- Styl: faktický, bez emocí, bez superlativů, bez "nejlepší"
- Čeština: spisovná, ale neformální, bez chyb

Příklad:
> Viktor Sheen (Viktor Dundič) je komerčně nejúspěšnější český rapper, který s albem Černobílej svět a společným projektem Roadtrip s Calinem dobyl O2 arenu. Poslouchej na Spotify.

Fakta:
- Žánry: ${rapper.genre?.join(', ') || 'neuvedeno'}
- Label: ${rapper.label || 'nezávislý'}
- Aktivní: ${rapper.active || 'neuvedeno'}
- Hity/alba: ${rapper.relatedAlbums?.join(', ') || 'neuvedeno'}
- Spolupráce: ${rapper.relatedRappers?.join(', ') || 'neuvedeno'}
- Poznámky: ${rapper.bio || 'žádná bio'}

Vygeneruj pouze samotný description text, žádné komentáře.
`.trim()

  // Use OpenClaw exec to call mistral-large-3:675b:cloud
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

  // Fallback: ručně sestavený description
  const fallback = `${rapper.title} (${rapper.realName || 'neznámé jméno'}) je ${rapper.genre?.[0] || 'český'} rapper ${rapper.label ? `z labelu ${rapper.label}` : 'nezávislý'}. ${rapper.relatedAlbums?.[0] ? `Známý z alba ${rapper.relatedAlbums[0]}.` : 'Poslouchej na Spotify.'}`
  return fallback.slice(0, 160)
}

// ─── Main ───
async function main() {
  console.log('🎤 Tier 1 rappers — description enhancer')
  console.log('='.repeat(50))

  for (const slug of TIER_1_SLUGS) {
    const filepath = join(RAPPERS_DIR, `${slug}.mdx`)
    if (!existsSync(filepath)) {
      console.log(`⚠️  ${slug} — soubor nenalezen`)
      continue
    }

    const content = readFileSync(filepath, 'utf8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter.title) {
      console.log(`⚠️  ${slug} — chybí title`)
      continue
    }

    // Skip if description is already good
    if (frontmatter.description && frontmatter.description.length >= 120 && !frontmatter.description.includes('je český rapper')) {
      console.log(`✅ ${slug} — description OK (${frontmatter.description.length} znaků)`)
      continue
    }

    console.log(`🔄 ${slug} — generuji description...`)
    const newDescription = await generateDescription(frontmatter)

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
      console.log(`✅ ${slug} — description aktualizována (${newDescription.length} znaků)`)
      console.log(`   → ${newDescription}`)
    } else {
      console.log(`⚠️  ${slug} — description nenalezeno`)
    }
  }

  console.log('\n🎤 Hotovo!')
}

main().catch(console.error)