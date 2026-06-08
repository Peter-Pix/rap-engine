#!/usr/bin/env node
// add-relatedGenres.mjs — přidá relatedGenres do YAML frontmatteru žánrových stránek
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const zanryDir = join(__dirname, '..', 'content', 'zanry')

const related = {
  'abstract-hip-hop': ['experimental-hip-hop', 'jazz-rap', 'art-rap'],
  'academic-rap': ['conscious-rap', 'lyrical-rap', 'spoken-word'],
  'afro-rap': ['afrobeats', 'dancehall', 'hip-hop'],
  'afrobeats': ['afro-rap', 'dancehall', 'pop-rap'],
  'alternative-hip-hop': ['experimental-hip-hop', 'art-rap', 'indie-rap'],
  'alternative-rap': ['alternative-hip-hop', 'experimental-rap', 'art-rap'],
  'ambient-rap': ['cloud-rap', 'lo-fi-rap', 'psychedelic-rap'],
  'art-rap': ['abstract-hip-hop', 'conceptual-rap', 'experimental-rap'],
  'bassline': ['uk-garage', 'grime', 'drum-and-bass'],
  'boom-bap': ['east-coast-rap', 'jazz-rap', 'hardcore-rap', 'old-school-cz', 'underground-rap'],
  'britsky-hip-hop': ['grime', 'uk-rap', 'uk-garage'],
  'cloud-rap': ['lo-fi-rap', 'ambient-rap', 'trap', 'emo-rap'],
  'comedy-rap': ['pop-rap', 'party-rap', 'shock-rap'],
  'comic-book-rap': ['conceptual-rap', 'theater-rap', 'art-rap'],
  'conceptual-rap': ['art-rap', 'theater-rap', 'conscious-rap', 'lyrical-rap'],
  'conscious-rap': ['political-rap', 'lyrical-rap', 'social-commentary', 'academic-rap'],
  'country-rap': ['southern-rap', 'rock-rap', 'pop-rock'],
  'czech-pop': ['pop-rap', 'pop', 'czech-rap'],
  'czech-rap': ['slovak-rap', 'pop-rap', 'trap', 'boom-bap', 'old-school-cz'],
  'dance-rap': ['pop-rap', 'party-rap', 'electronic-rap'],
  'dancehall': ['reggaeton', 'afrobeats', 'afro-rap'],
  'dark-rap': ['trap', 'drill', 'cloud-rap', 'emo-rap', 'gothic-rap'],
  'dark-trap': ['dark-rap', 'trap', 'drill', 'rage'],
  'drill': ['trap', 'uk-drill', 'gangsta-rap', 'dark-rap'],
  'drum-and-bass': ['jungle-mc', 'drum-and-bass-mc', 'electronic-rap'],
  'drum-and-bass-mc': ['drum-and-bass', 'jungle-mc', 'grime'],
  'east-coast-rap': ['boom-bap', 'hardcore-rap', 'jazz-rap'],
  'electronic-rap': ['house-rap', 'uk-garage', 'glitch-hop', 'drum-and-bass'],
  'emo-rap': ['sad-rap', 'cloud-rap', 'dark-rap', 'lo-fi-rap', 'rage'],
  'experimental-hip-hop': ['abstract-hip-hop', 'alternative-hip-hop', 'glitch-hop'],
  'experimental-rap': ['abstract-hip-hop', 'art-rap', 'psychedelic-rap'],
  'experimental-trap': ['trap', 'dark-trap', 'rage', 'glitch-hop'],
  'freestyle-rap': ['rap', 'battle-rap', 'underground-rap'],
  'gangsta-rap': ['street-rap', 'drill', 'mafioso-rap', 'hardcore-rap'],
  'garage-punk': ['punk', 'punk-rap', 'rock-rap'],
  'glitch-hop': ['electronic-rap', 'experimental-hip-hop', 'turntablism'],
  'gothic-rap': ['dark-rap', 'horrorcore', 'mystical-rap'],
  'grime': ['uk-garage', 'drum-and-bass', 'uk-rap', 'drill'],
  'hardcore-punk': ['punk', 'garage-punk', 'hardcore-rap'],
  'hardcore-rap': ['boom-bap', 'east-coast-rap', 'gangsta-rap', 'street-rap'],
  'hip-hop': ['rap', 'boom-bap', 'trap', 'czech-rap', 'underground-hip-hop'],
  'horrorcore': ['gothic-rap', 'dark-rap', 'mystical-rap', 'shock-rap'],
  'house-rap': ['electronic-rap', 'dance-rap', 'uk-garage'],
  'jazz-rap': ['boom-bap', 'abstract-hip-hop', 'lo-fi-rap', 'soul'],
  'jungle-mc': ['drum-and-bass', 'grime', 'drum-and-bass-mc'],
  'lo-fi-rap': ['cloud-rap', 'ambient-rap', 'jazz-rap', 'sad-rap'],
  'lyrical-rap': ['boom-bap', 'conscious-rap', 'academic-rap', 'conceptual-rap'],
  'mafioso-rap': ['gangsta-rap', 'southern-rap', 'street-rap'],
  'mainstream-rap': ['pop-rap', 'trap', 'melodic-rap'],
  'melodic-rap': ['pop-rap', 'trap', 'emo-rap', 'rnb'],
  'melodic-trap': ['trap', 'melodic-rap', 'pop-rap', 'rnb'],
  'modern-rap': ['trap', 'drill', 'pop-rap', 'melodic-rap'],
  'mumble-rap': ['trap', 'cloud-rap', 'emo-rap', 'rage'],
  'mystical-rap': ['horrorcore', 'gothic-rap', 'mythological-rap', 'spiritual-rap'],
  'mythological-rap': ['mystical-rap', 'horrorcore', 'conceptual-rap', 'theater-rap'],
  'nu-metal': ['rap-metal', 'rock-rap', 'alternative-metal'],
  'oriental-rap': ['world-music', 'afro-rap', 'czech-rap'],
  'party-rap': ['dance-rap', 'pop-rap', 'comedy-rap'],
  'political-punk': ['punk', 'political-rap', 'hardcore-punk'],
  'political-rap': ['conscious-rap', 'social-commentary', 'academic-rap', 'political-punk'],
  'pop': ['pop-rap', 'czech-pop', 'pop-rock'],
  'pop-rap': ['trap', 'melodic-rap', 'pop', 'czech-pop'],
  'pop-rock': ['rock-rap', 'pop', 'punk-rap'],
  'pornorap': ['shock-rap', 'comedy-rap', 'party-rap'],
  'power-metal': ['traditional-metal', 'hardcore-punk', 'speed-metal'],
  'psychedelic-rap': ['cloud-rap', 'ambient-rap', 'experimental-rap', 'glitch-hop'],
  'punk': ['punk-rap', 'hardcore-punk', 'garage-punk', 'political-punk'],
  'punk-rap': ['punk', 'rap-rock', 'rock-rap', 'hardcore-punk'],
  'rage': ['trap', 'dark-trap', 'emo-rap', 'experimental-trap'],
  'rap': ['hip-hop', 'trap', 'boom-bap', 'drill', 'czech-rap'],
  'rap-metal': ['nu-metal', 'rock-rap', 'hardcore-rap'],
  'reggaeton': ['dancehall', 'pop', 'latin-trap'],
  'rnb': ['soul', 'pop', 'melodic-rap', 'hip-hop'],
  'road-rap': ['gangsta-rap', 'southern-rap', 'street-rap'],
  'rock-rap': ['rap-metal', 'nu-metal', 'punk-rap', 'pop-rock'],
  'sad-rap': ['emo-rap', 'lo-fi-rap', 'cloud-rap', 'dark-rap'],
  'shock-rap': ['horrorcore', 'pornorap', 'comedy-rap', 'gangsta-rap'],
  'slovak-rap': ['czech-rap', 'trap', 'pop-rap'],
  'soul': ['rnb', 'jazz-rap', 'hip-hop'],
  'southern-rap': ['trap', 'gangsta-rap', 'country-rap', 'bounce'],
  'spoken-word': ['poetry-slam', 'academic-rap', 'conscious-rap'],
  'street-rap': ['gangsta-rap', 'hardcore-rap', 'boom-bap', 'underground-rap'],
  'theater-rap': ['conceptual-rap', 'comic-book-rap', 'horrorcore', 'art-rap'],
  'traditional-metal': ['power-metal', 'speed-metal', 'heavy-metal'],
  'trap': ['drill', 'dark-rap', 'pop-rap', 'melodic-trap', 'rage'],
  'trap-metal': ['trap', 'rap-metal', 'nu-metal', 'rock-rap'],
  'turntablism': ['hip-hop', 'glitch-hop', 'drum-and-bass'],
  'uk-garage': ['grime', 'drum-and-bass', 'electronic-rap', 'bassline'],
  'uk-rap': ['grime', 'britsky-hip-hop', 'uk-garage', 'drill'],
  'underground-hip-hop': ['underground-rap', 'boom-bap', 'alternative-hip-hop', 'czech-rap'],
  'underground-rap': ['underground-hip-hop', 'street-rap', 'hardcore-rap', 'boom-bap'],
  'underground-rock': ['punk', 'garage-punk', 'alternative-rock'],
}

import { readdirSync } from 'fs'

const files = readdirSync(zanryDir).filter(f => f.endsWith('.mdx'))
let updated = 0

for (const file of files) {
  const slug = file.replace('.mdx', '')
  const path = join(zanryDir, file)
  let content = readFileSync(path, 'utf8')

  if (!related[slug]) continue
  if (content.includes('relatedGenres:')) continue

  // Vložit relatedGenres za description: nebo origin:
  const list = related[slug].map(g => `"${g}"`).join(', ')
  content = content.replace(/^(description:.*)$/m, (match) => {
    return match + `\nrelatedGenres: [${list}]`
  })

  writeFileSync(path, content, 'utf8')
  updated++
}

console.log(`✅ relatedGenres přidáno do ${updated} ze 92 souborů`)