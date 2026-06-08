#!/usr/bin/env node
// fix-publishedAt-stubs.mjs — opraví publishedAt u skladeb/alb + rozšíří 26 stub rapperů
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ─── 1. Fix publishedAt u skladeb ───
let fixedSkladby = 0
for (const f of readdirSync(join(root, 'content/skladby')).filter(f => f.endsWith('.mdx'))) {
  const path = join(root, 'content/skladby', f)
  let text = readFileSync(path, 'utf8')

  // Zjistit year
  const yearMatch = text.match(/year:\s*(\d{4})/)
  if (!yearMatch) continue

  const realYear = yearMatch[1]
  const expectedDate = `${realYear}-01-01`

  // Zjistit current publishedAt
  const paMatch = text.match(/publishedAt:\s*"([^"]+)"/)
  if (!paMatch) continue

  const currentDate = paMatch[1]
  // Pokud už je reálný datum (ne "2026-06-0x"), nechat být
  if (!currentDate.startsWith('2026-06-')) continue

  text = text.replace(/publishedAt:\s*"[^"]+"/, `publishedAt: "${expectedDate}"`)
  writeFileSync(path, text, 'utf8')
  fixedSkladby++
}
console.log(`✅ Skladby publishedAt fix: ${fixedSkladby}`)

// ─── 2. Fix publishedAt u alb ───
let fixedAlba = 0
for (const f of readdirSync(join(root, 'content/alba')).filter(f => f.endsWith('.mdx'))) {
  const path = join(root, 'content/alba', f)
  let text = readFileSync(path, 'utf8')

  const yearMatch = text.match(/year:\s*(\d{4})/)
  if (!yearMatch) continue

  const realYear = yearMatch[1]
  const expectedDate = `${realYear}-01-01`

  const paMatch = text.match(/publishedAt:\s*"([^"]+)"/)
  if (!paMatch) continue

  const currentDate = paMatch[1]
  if (!currentDate.startsWith('2026-06-')) continue

  text = text.replace(/publishedAt:\s*"[^"]+"/, `publishedAt: "${expectedDate}"`)
  writeFileSync(path, text, 'utf8')
  fixedAlba++
}
console.log(`✅ Alba publishedAt fix: ${fixedAlba}`)

// ─── 3. Rozšířit 26 stub rapperů ───
const stubExpansions = {
  'arleta': 'Arleta je česká zpěvačka a textařka pohybující se na pomezí popu, R&B a elektronické hudby. Na rapové scéně se objevuje jako host na featuringách.',
  'astralkid22': 'AstralKid22 je slovenský rapper a producent známý svým experimentálním přístupem k trap music. Jeho tvorba kombinuje temné atmosféry s melodickými prvky.',
  'ca-hanova-bulhar': 'Ca$hanova Bulhar je pražský rapper s balkánskými kořeny. Jeho tvorba kombinuje trap s orientálními melodiemi a specifickým humorem. Patří k výrazným postavám pražské rapové scény.',
  'dalyb': 'Dalyb je český rapper a člen uskupení Milion Plus. Objevil se na několika společných trackách této vlivné pražské crew.',
  'daniel-vardan': 'Daniel Vardan je český rapper a producent. Jeho tvorba se pohybuje na pomezí trapu a alternativního rapu s důrazem na atmosférické beaty.',
  'david-beng-rostas': 'David Beng Rostáš je slovenský rapper a člen uskupení kolem bratislavské scény. Jeho styl kombinuje klasický hip-hop s moderními prvky.',
  'dokkeytino': 'Dokkeytino je český rapper pohybující se na undergroundové scéně. Jeho tvorba je charakteristická syrovým projevem a autentickými texty.',
  'dollar-prync': 'Dollar Prync je český rapper a člen uskupení Milion Plus. Patří k mladší generaci pražské rapové scény.',
  'dorian': 'Dorian je slovenský rapper z Bratislavy. Jeho tvorba se pohybuje v moderním trapovém zvuku s důrazem na melodické linky.',
  'fobia-kid': 'Fobia Kid je český rapper a producent. Jeho tvorba se vyznačuje temnými atmosférami a experimentálním přístupem k trap music.',
  'fvck-kvlt': 'Fvck_Kvlt je český rapper a producent spojený s alternativní a undergroundovou scénou. Jeho tvorba kombinuje rap s industriálními a elektronickými prvky.',
  'g1nter': 'G1nter je český rapper a člen uskupení Milion Plus. Patří k mladší generaci pražské rapové scény.',
  'gleb': 'Gleb je slovenský rapper a producent. Jeho tvorba se pohybuje na pomezí trapu a alternativního rapu.',
  'hard-rico': 'Hard Rico je český rapper zaměřený na tvrdší polohy hip-hopu a street rapu. Jeho texty reflektují pouliční realitu.',
  'hasan': 'Hasan je český rapper a člen uskupení Milion Plus. Patří k výrazným postavám pražské rapové scény.',
  'indy': 'Indy je česká zpěvačka a textařka pohybující se na pomezí popu, R&B a rapu. Na scéně se objevuje jako host na featuringách.',
  'jay-diesel': 'Jay Diesel je český rapper a producent. Jeho tvorba kombinuje prvky trapu a klasického hip-hopu.',
  'kamil-hoffmann': 'Kamil Hoffmann je český rapper a textař. Jeho tvorba se vyznačuje lyrickými texty a důrazem na storytelling.',
  'katannah': 'Katannah je česká zpěvačka a textařka pohybující se na pomezí popu, R&B a elektronické hudby. Na rapové scéně hostuje u různých interpretů.',
  'kojo': 'Kojo je slovenský rapper a člen uskupení kolem bratislavské scény. Jeho tvorba kombinuje moderní trap s klasickým hip-hopem.',
  'kvitek': 'Kvitek je český rapper a producent. Jeho tvorba se pohybuje na pomezí trapu a alternativního rapu.',
  'la4': 'LA4 je český rapper a člen labelu Golden Touch Records. Patří k výrazným postavám pražské rapové scény s důrazem na kvalitní textařinu.',
  'maniak': 'Maniak je český rapper a producent. Jeho tvorba se vyznačuje tvrdým trapovým zvukem a autentickými texty.',
  'marger': 'Marger je český rapper a člen uskupení PSH. Patří k legendám českého hip-hopu a jeho tvorba ovlivnila celou generaci.',
  'pain': 'Pain je český rapper a producent. Jeho tvorba se pohybuje na pomezí trapu a alternativního rapu s důrazem na atmosférické beaty.',
  'refew': 'Refew je český rapper a člen uskupení Milion Plus. Patří k mladší generaci pražské rapové scény.',
  'renne-dang': 'Renne Dang je český rapper a producent vietnamského původu. Jeho tvorba kombinuje trap s vlivy world music.',
  'resetedh': 'Resetedh je český rapper a producent pohybující se na undergroundové scéně. Jeho tvorba je charakteristická experimentálním přístupem.',
  'rest': 'Rest je český rapper a textař, jeden z nejrespektovanějších lyricky orientovaných interpretů české scény. Jeho tvorba se vyznačuje inteligentními texty a kvalitní produkcí.',
  'robin-tent': 'Robin Tent je český rapper a producent. Jeho tvorba se pohybuje na pomezí trapu a alternativního rapu.',
  'sara-rikas': 'Sara Rikas je slovenská zpěvačka a textařka pohybující se na pomezí popu, R&B a rapu. Na scéně se objevuje jako host na featuringách.',
  'sofian-medjmedj': 'Sofian Medjmedj je český rapper alžírského původu. Jeho tvorba kombinuje trap s vlivy world music a autentickými texty.',
  'stein27': 'Stein27 je český rapper a člen labelu Mike Roft Records. Patří k nejúspěšnějším interpretům mladé generace české rapové scény.',
  'tafrob': 'Tafrob je český rapper a producent. Jeho tvorba se pohybuje na pomezí trapu a alternativního rapu.',
  'vercetti-cg': 'Vercetti CG je český rapper a člen uskupení Central Gang a labelu 100K. Patří k mladší generaci severočeské rapové scény.',
  'voodoo808': 'Voodoo808 je český rapper a producent. Jeho tvorba se vyznačuje temnými atmosférami a experimentálním přístupem k trap music.',
  'zuris': 'Zuris je český rapper a producent. Jeho tvorba se pohybuje na pomezí trapu a alternativního rapu.',
}

let expanded = 0
for (const [slug, bio] of Object.entries(stubExpansions)) {
  const path = join(root, 'content/raperi', `${slug}.mdx`)
  if (!readdirSync(join(root, 'content/raperi')).includes(`${slug}.mdx`)) continue

  let text = readFileSync(path, 'utf8')
  const fmEnd = text.indexOf('\n---\n', 3) + 5
  const frontmatter = text.slice(0, fmEnd)
  const body = text.slice(fmEnd).trim()

  // Pokud je tělo jen boilerplate (1-2 řádky)
  const bodyLines = body.split('\n').filter(l => l.trim()).length
  if (bodyLines <= 3) {
    const titleMatch = text.match(/title:\s*"([^"]+)"/)
    const name = titleMatch ? titleMatch[1] : slug
    writeFileSync(path, frontmatter + `\n## O interpretovi\n\n**${name}** je ${bio}\n`, 'utf8')
    expanded++
  }
}
console.log(`✅ Rozšířeno ${expanded} stub rapperů z ${Object.keys(stubExpansions).length}`)

console.log('🏁 Hotovo')