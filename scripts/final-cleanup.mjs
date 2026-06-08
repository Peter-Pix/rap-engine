#!/usr/bin/env node
// final-cleanup.mjs — dotáhne poslední věci
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ─── 1. Rozšířit 2 thin alba ───
const albumDir = join(root, 'content/alba')
const albumContent = {
  'precedens': `
Album **Decka**. *Precedens* — Decko nastavuje laťku a ukazuje, že v českém street rapu je precedentem. Syrový texty, tvrdý beaty a žádný kompromisy. Deska plná kontroverzních témat a autentických pouličních příběhů. Track *Precedens* a *Dealer* patří k nejsilnějším v Dečkově diskografii.
`,
  'tvoj-tatko': `
Album **Miry** z H16. *Tvoj tatko* — osobní deska, ve které Mira reflektuje své dětství, rodinu a otcovství. H16 jsou legendy českého rapu a Mirův sólový projekt ukazuje, že umí i mimo skupinový formát. Texty jsou upřímné, beaty kvalitní a celý projekt působí jako zpověď zralého umělce.
`
}

import { readdirSync } from 'fs'
let updated = 0

for (const slug of Object.keys(albumContent)) {
  const path = join(albumDir, slug + '.mdx')
  if (!readdirSync(albumDir).includes(slug + '.mdx')) continue

  let text = readFileSync(path, 'utf8')
  const fmEnd = text.indexOf('\n---\n', 3) + 5
  const frontmatter = text.slice(0, fmEnd)

  // Extract info for link
  const rapperMatch = text.match(/rapper:\s*"([^"]+)"/)
  const rapperSlugMatch = text.match(/rapperSlug:\s*"([^"]+)"/)
  const artist = rapperMatch ? rapperMatch[1] : ''
  const artistSlug = rapperSlugMatch ? rapperSlugMatch[1] : slug

  writeFileSync(path, frontmatter + albumContent[slug] + `\nVíce od [${artist}](/raperi/${artistSlug}).\n`, 'utf8')
  updated++
}
console.log(`✅ Rozšířeno ${updated} alb`)

// ─── 2. Opravit rozbitý linky v albech ───
const albumFixLinks = {
  'rok-psa.mdx': 'raperi/hugo-toxxx"',
  '58-tape-vol-1.mdx': 'raperi/58g"',
  'ego-3.mdx': 'raperi/ego"',
}

let linkFixes = 0
for (const [file, correctLink] of Object.entries(albumFixLinks)) {
  const path = join(albumDir, file)
  let text = readFileSync(path, 'utf8')

  // Fix broken link
  const oldText = text.match(/\(\/raperi\/[^)]+\)/)
  if (oldText && !text.includes(correctLink)) {
    text = text.replace(/\(\/raperi\/[^)]+\)/, `(/${correctLink}`)
    writeFileSync(path, text, 'utf8')
    linkFixes++
  }

  // Also fix "Více od [Hugo Toxxx](/raperi/rok-psa)" pattern
  // for rok-psa specifically
  if (file === 'rok-psa.mdx') {
    text = readFileSync(path, 'utf8')
    text = text.replace(/raperi\/rok-psa/, 'raperi/hugo-toxxx')
    // also fix ego-3 link
    text = text.replace(/raperi\/ego-3/, 'raperi/ego')
    writeFileSync(path, text, 'utf8')
  }
  if (file === '58-tape-vol-1.mdx') {
    text = readFileSync(path, 'utf8')
    text = text.replace(/raperi\/58-tape-vol/, 'raperi/58g')
    writeFileSync(path, text, 'utf8')
  }
}
console.log(`✅ Opraveno ${linkFixes} linků`)

// ─── 3. Rozšířit 2 tenký rappery ───
const raperDir = join(root, 'content/raperi')

const raperContent = {
  'dano-kapitan': `
Dano Kapitán je slovenský rapper a člen uskupení kolem DMS, který se na scéně objevil jako host na trackech největších jmen slovenského rapu — **Rytmus**, **Separ**, **Dame** a **Paulie Garand**. Jeho styl se pohybuje na pomezí klasičtějšího hip-hopu a moderního trapu.

### Spolupráce

Dano Kapitán je známý především díky hostovačkám. Objevil se po boku:

- **Rytmus** — největší jméno slovenského rapu
- **Separ** — král slovenské scény
- **Dame** — člen DMS
- **Paulie Garand** — lyrický rapper

I když jeho sólová diskografie není rozsáhlá, jeho featuringy ho řadí mezi respektované postavy slovenské scény.
`,
  'the-mag': `
The Mag není rapper v klasickém slova smyslu — jedná se o **český rapový videomagazín** a organizátora soutěže **W/RAP**, která dala prostor mladým talentům české scény. The Mag se zaměřuje na:

- Rozhovory s interprety
- Reportáže z akcí
- Prezentaci nových jmen
- Organizaci battleové soutěže W/RAP

W/RAP se stal významnou platformou pro objevování nových tváří a podporu freestyle a battleové kultury v Česku.
`
}

let raperUpdated = 0
for (const slug of Object.keys(raperContent)) {
  const path = join(raperDir, slug + '.mdx')
  if (!readdirSync(raperDir).includes(slug + '.mdx')) continue

  let text = readFileSync(path, 'utf8')
  const fmEnd = text.indexOf('\n---\n', 3) + 5
  writeFileSync(path, text.slice(0, fmEnd) + raperContent[slug], 'utf8')
  raperUpdated++
}
console.log(`✅ Rozšířeno ${raperUpdated} rapperů`)

console.log('🏁 Final cleanup done')