#!/usr/bin/env node

/**
 * enhance-tier2a.mjs
 * 
 * Pro Tier 2A rappers (15 důležitých umělců se stuby) přepíše celý profil
 * podle stylu z článků (faktický, bez emocí, s detaily, 200-400 slov).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve('/Users/petrpiskacek/.openclaw/workspace/Project_1/rap-engine-second-trial')
const RAPPERS_DIR = join(ROOT, 'content', 'raperi')
const TIER_2A_SLUGS = [
  'calin', 'hugo-toxxx', 'maniak', 'rest', 'orion',
  'paulie-garand', 'marpo', 'indy', 'lipo', 'kato',
  'idea', 'james-cole', 'sergei-barracuda', 'kenny-rough', 'vladimir-518'
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

// ─── Util: generate full bio with LLM ───
async function generateBio(rapper) {
  const prompt = `
Jsi ostřílený redaktor českého hip-hop magazínu. Tvůj úkol:

Napiš profil rappera ${rapper.title} (${rapper.realName || 'neznámé jméno'}) pro encyklopedii 4rap.cz.

Pravidla:
- Styl: faktický, bez emocí, bez superlativů, bez "nejlepší", bez "legenda"
- Struktura: 3-4 odstavce (200-400 slov celkem)
- Obsah:
  1. Úvod: kdo to je, odkud je, hlavní žánr/label, klíčové období
  2. Kariéra: klíčová alba, hity, spolupráce, milníky
  3. Styl: zvuk, texty, image, co ho odlišuje
  4. Vliv: jak ovlivnil scénu, co po něm zůstalo
- Čeština: spisovná, ale neformální, bez chyb
- Nesmí obsahovat: "je český rapper", "je známý", "je populární", "v současnosti"

Příklad struktury:

Kato (Adam Svatoš) z Prago Union je básník, který si rap vzal jako médium. Jeho texty jsou temné, propracované a mají schopnost se vtisknout do ucha i do hlavy na dlouho po posledním refrénu. Žádné laciné emoce, žádné pózování – jen syrová autenticita.

Jeho styl definuje hluboká melancholie, hra s jazykem a schopnost vyprávět příběhy, které sednou napříč generacemi. Pojďme se podívat, jak Kato proměnil českou rapovou krajinu.

Vývoj tvorby Adama Svatoše je pořádná jízda. Od komerčního vstupu v Chaozzu přes osobní krizi až k absolutní lingvistické svobodě. V devadesátkách působil jako Deph v Chaozz a byl to fenomén. Hravý, drzý rap pro teenagery – „Vodopády“, „Planeta opic“. Rychlá sláva, tlak průmyslu, vyhoření. A pak konec kapely.

Po Chaozzu se proměnil. Deph se stal Katem. Ztráta zubů, nový hlas, nový přístup. Spolu s DJ Skuplem založil Prago Union a začal psát jiný typ písní – temnější, osobnější, detailnější. Zlom přišel s albem HDP (2005).

HDP nebylo jen album, bylo to vyznání. Texty se stáhly do ústraní: dlouhé noci, dluhy, kocoviny, samota. Zvukově boombapová estetika, špinavá a melancholická atmosféra. To nebyl comeback kvůli hitům — to byla potřeba mluvit jinak, upřímně. Byl to restart na úrovni identity.

Fakta:
- Žánry: ${rapper.genre?.join(', ') || 'neuvedeno'}
- Label: ${rapper.label || 'nezávislý'}
- Aktivní: ${rapper.active || 'neuvedeno'}
- Hity/alba: ${rapper.relatedAlbums?.join(', ') || 'neuvedeno'}
- Spolupráce: ${rapper.relatedRappers?.join(', ') || 'neuvedeno'}
- Poznámky: ${rapper.bio || 'žádná bio'}

Vygeneruj pouze samotný text bio, žádné komentáře, žádné nadpisy, žádné uvozovky.
`.trim()

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-large-3:675b:cloud',
        prompt,
        stream: false,
        options: { temperature: 0.4 }
      })
    })
    const data = await response.json()
    if (data.response) return data.response.trim()
  } catch (e) {
    console.warn('⚠️  LLM fallback:', e.message)
  }

  // Fallback: krátká bio
  return `**${rapper.title}** (${rapper.realName || 'neznámé jméno'}) je ${rapper.genre?.[0] || 'český'} rapper ${rapper.label ? `z labelu ${rapper.label}` : 'nezávislý'}. ${rapper.relatedAlbums?.[0] ? `Známý z alba ${rapper.relatedAlbums[0]}.` : ''} ${rapper.bio || 'Profil bude doplněn.'}`
}

// ─── Main ───
async function main() {
  console.log('🎤 Tier 2A rappers — full bio enhancer')
  console.log('='.repeat(50))

  for (const slug of TIER_2A_SLUGS) {
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

    // Check if bio is stub
    const hasStub = content.includes('## Bio') && content.includes('_Stub — doplnit._')
    if (!hasStub) {
      console.log(`✅ ${slug} — bio již existuje`)
      continue
    }

    console.log(`🔄 ${slug} — generuji bio...`)
    const newBio = await generateBio(frontmatter)

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
      console.log(`✅ ${slug} — bio aktualizována (${newBio.length} znaků)`)
    } else {
      console.log(`⚠️  ${slug} — bio nenalezena`)
    }
  }

  console.log('\n🎤 Hotovo!')
}

main().catch(console.error)