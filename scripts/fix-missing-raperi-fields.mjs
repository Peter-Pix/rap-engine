#!/usr/bin/env node
// fix-missing-raperi-fields.mjs — doplní genre, publishedAt, entityType 13 rapperům
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '..', 'content/raperi')

const fixes = {
  'eusebio': {
    genre: ['czech-pop', 'latin-rap'],
    entityType: 'rapper',
    description: 'Eusebio je pražský rapper kombinující češtinu se španělskými vlivy. Autor alba La Farándula (2017) s latinskoamerickou produkcí a hosty jako Peter Pann a Kali.'
  },
  'grimaso': {
    genre: ['hip-hop', 'boom-bap', 'underground-rap'],
    entityType: 'rapper',
    description: 'Grimaso je slovenský rapper a producent z Bratislavy spojený s H16 crew. Autor alb Heartbeat (2013), Beat Tape 1 (2020), Beat Tape 2 (2020) a Vis Major Mixtape (2022).'
  },
  'irit': {
    genre: ['hip-hop', 'rap'],
    entityType: 'rapper',
    description: 'Irit je pražský rapper a člen uskupení kolem Grimasa. Autor alba V pekle raj (2026). Spolupracuje s Grimasem, Hugem Toxxxem a Spack DS.'
  },
  'jckpt': {
    genre: ['hip-hop', 'underground-rap'],
    entityType: 'rapper',
    description: 'Jckpt je pražský rapper. Autor alb Noční Podnik (2014) a 111 (2020).'
  },
  'katarzia': {
    genre: ['czech-pop', 'indie-pop'],
    entityType: 'zpevak',
    description: 'Katarzia je slovenská zpěvačka a textařka z Bratislavy. Autorka alb Šťastné dieťa (2023), Celibát (2020), n5 (2021) a Pozvi ma, neprídem (2026).'
  },
  'matej-straka': {
    genre: ['pop-rap', 'czech-rap'],
    entityType: 'rapper',
    description: 'Matej Straka je česko-slovenský rapper. Hostoval na skladbách s Dame, Irit, Majk Spirit a MOMO.'
  },
  'miky-mora': {
    genre: ['hip-hop', 'underground-rap'],
    entityType: 'rapper',
    description: 'Miky Mora je pražský rapper a dlouholetá postava českého hip-hopu. Autor 7 alb od roku 2008 — 20.8. (Hudba z Hora), Ilegal Mixtejp, G.A.S.R, Diktátor, Rep Vol. 1 & 2 a Multi.'
  },
  'momo': {
    genre: ['hip-hop', 'trap', 'slovak-rap'],
    entityType: 'rapper',
    description: 'MOMO je slovenský rapper z Martina. Autor alb Sequel of Momo (2022), STREET HAMLET (2023), Atlantída (2024), KONEXIA (2025) a Milovaný (2026). Spolupracuje s Kalim, Rytmusem a Hoodinim.'
  },
  'neries': {
    genre: ['hip-hop', 'rap'],
    entityType: 'rapper',
    description: 'Nerieš je slovenský rapper z Bratislavy a člen uskupení DMS. Autor alb Minimal (2015), OK (2020), 311 (2021), HELLO (2024) a Naspäť domov (2025). Spolupracuje se Separrem, Kontrafaktem a Kali.'
  },
  'prezident-lourajder': {
    genre: ['hip-hop', 'underground-rap', 'boom-bap'],
    entityType: 'rapper',
    description: 'Prezident Lourajder je pražský rapper s bohatou undergroundovou diskografií. Autor 8 alb včetně Opus Magnum (2021), INTERREGNUM (2023) a Domáce Práce (2020).'
  },
  'sakito': {
    genre: ['hip-hop', 'slovak-rap'],
    entityType: 'rapper',
    description: 'Sakito je slovenský rapper z Bratislavy. Autor alba HOLLYMOOD mixtape (2021) s hosty jako Grimaso a Majk Spirit.'
  },
  'tisci': {
    genre: ['trap', 'slovak-rap'],
    entityType: 'rapper',
    description: 'Tisci je slovenský rapper z Bratislavy. Autor alb FUTUREPUNK (2020), before FUTUREPUNK (2020) a COLD HEART HUSTLA (2022).'
  },
  'vojtaano': {
    genre: ['czech-rap', 'soundtrack'],
    entityType: 'rapper',
    description: 'Vojtaano je rapper z Vyšehradu. Autor alba Vyšehrad DVJE (Soundtrack) (2025) napojený na filmovou sérii Vyšehrad.'
  }
}

import { readdirSync } from 'fs'

let updated = 0
for (const file of readdirSync(dir).filter(f => f.endsWith('.mdx'))) {
  const slug = file.replace('.mdx', '')
  if (!fixes[slug]) continue

  const path = join(dir, file)
  let text = readFileSync(path, 'utf8')
  let changed = false

  const fx = fixes[slug]

  // entityType
  if (fx.entityType && !text.includes('entityType:')) {
    text = text.replace(/^description:/m, `entityType: "${fx.entityType}"\ndescription:`)
    changed = true
  }

  // genre
  if (!text.includes('genre:')) {
    const genreList = fx.genre.map(g => `"${g}"`).join(', ')
    text = text.replace(/^description:/m, `genre: [${genreList}]\ndescription:`)
    changed = true
  }

  // publishedAt
  if (!text.includes('publishedAt:')) {
    text = text.replace(/^description:.*$/m, m => m + '\npublishedAt: "2026-06-08"')
    changed = true
  }

  // Upgrade description pokud je moc krátká
  if (text.includes('description: "' + slug.replace('-', ' ') + ' — rapper')) {
    text = text.replace(/description: "([^"]+)"/, `description: "${fx.description}"`)
    changed = true
  }

  if (changed) {
    writeFileSync(path, text, 'utf8')
    updated++
  }
}

console.log(`✅ Opraveno ${updated} rapperů z 13`)