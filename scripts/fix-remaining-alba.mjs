#!/usr/bin/env node
// fix-remaining-alba.mjs — napraví chybné přiřazení + dotáhne zbytek
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dir = join(root, 'content/alba')

const content = {
  '7': { text: `Album **7krát3** — projekt tří osobností českého undergroundu. Deska kombinuje experimentální rap s jazzovými a elektronickými prvky. 7krát3 jsou známí svým intelektuálním přístupem a neotřelými texty. Track *Kafe a cigárko* patří k jejich nejsilnějším.` },
  'budapest': { text: `Track nebo projekt **Ca$hanovy Bulhar** inspirovaný Budapeští. Ca$hanova Bulhar je pražský rapper s balkánskými kořeny, jehož tvorba kombinuje trap s orientálními melodiemi a specifickým humorem. Budapest evokuje noční atmosféru maďarské metropole.` },
  'e-t': { text: `Album **Majk Spirita** z roku 2021. *E.T.* — návrat k jeho kořenům a zároveň posun vpřed. Majk Spirit na téhle desce ukazuje, že pořád patří k nejlepším slovenským rapperům. Kombinuje chytlavé refrény s propracovanými texty a produkcí od renomovaných beatmakerů.` },
  'figury': { text: `Album **Michajlova**. *Figury* jako šachové figurky — Michajlov na týhle desce přemýšlí o lidech, kteří ho obklopují, o vztazích a společenských hrách. Jeho texty jsou intelektuální, beaty temné a atmosférické. Jeden z nejosobitějších projektů na české scéně.` },
  'goldcigo': { text: `Projekt od **NobodyListen**. *Goldcigo* je experimentální nahrávka, která posouvá hranice českého rapu. NobodyListen je známý svým nekonvenčním přístupem — mix elektroniky, ambientu a rapu. Tahle deska není pro každého, ale kdo ji pochopí, objeví nový rozměr české hudby.` },
  'mam-to': { text: `Album **MC Geye** z roku 2020. *Mám to* — typicky ironickej a sebevědomej název pro jednoho z nejoriginálnějších textařů české scény. MC Gey na týhle desce kombinuje svůj charakteristickej černej humor s kritickým pohledem na společnost. Tracky jako *Mám to* a *Rapová elita* ukazují jeho lyrický um.` },
  'novy-clovek': { text: `Album od **Nik Tenda**. *Nový člověk* — osobní deska, ve které Nik Tendo reflektuje změny ve svém životě. Od trapových beatů po melodičtější polohy. Nik Tendo je jedním z nejvýraznějších představitelů českého trapu.` },
  'precedens': { text: `Album **Decka**. *Precedens* — Decko nastavuje laťku a ukazuje, že v českém street rapu je precedentem. Syrový texty, tvrdý beaty a žádný kompromisy. Deska plná kontroverzních témat a autentických pouličních příběhů.` },
  'red-card': { text: `Album **ADiss** z roku 2017. *Red Card* — červená karta. ADiss na týhle desce ukazuje, že umí kombinovat R&B s pop-rapem. Je to jeho vyzrálejší nahrávka s výrazným podílem zpívaných refrénů a osobnějšími texty.` },
  'reprezentuju': { text: `Projekt od **Forest Blunt**. *Reprezentuju* — Forest Blunt reprezentuje svůj sound, svůj kolektiv a svůj styl. Kombinace trapu a hip-hopu s lehce psychedelickým nádechem. Forest Blunt patří k výrazným postavám undergroundové scény.` },
  'top': { text: `Projekt **Rytmuse**. *Top* — Rytmus na vrcholu. Slovenská rapová superstar potvrzuje svou pozici hitovými tracky, známými featuringy a produkcí, která sedí do rádií i do klubů. Rytmus je legenda slovenského rapu a tahle deska to jen potvrzuje.` },
  'tvoj-tatko': { text: `Album **Miry** z H16. *Tvoj tatko* — osobní deska, ve které Mira reflektuje své dětství, rodinu a život. H16 jsou legendy českého rapu a Mirův sólový projekt ukazuje, že umí i mimo skupinový formát. Texty jsou upřímné, beaty kvalitní.` },
  'umenie-zit': { text: `Projekt od **NobodyListen**. *Umenie žiť* — filosofický název pro experimentální nahrávku kombinující rap s ambientem a elektronikou. NobodyListen je jeden z nejoriginálnějších umělců české scény, jehož tvorba nemá v ČR obdoby.` },
  'velke-hry': { text: `Album **Decka**. *Velký hry* — Decko na vrcholu. Deska plná nadhledu, tvrdých textů a beatů, který sedí do auta i do klubu. Decko patří k nejvýraznějším postavám českého street rapu. Tracky jako *Velký hry* a *Dealer* jsou klasikou žánru.` },
  'zkusenosti': { text: `Album **NobodyListen**. *Zkušenosti* — NobodyListen reflektuje svou cestu hudbou a životem. Experimentální zvuk, filosofické texty a originální produkce. Deska, která se vymyká všem zažitým škatulkám českého rapu.` },
  'zustat-silnej': { text: `Album **Resta**. *Zůstat silnej* — Rest patří k nejrespektovanějším textařům české scény a tahle deska je důkazem. Osobní, upřímný, bez zbytečný pózy. Rest umí napsat track, kterej ti zůstane v hlavě, a na týhle desce to potvrzuje.` },
}

import { readdirSync } from 'fs'

let updated = 0
for (const file of readdirSync(dir).filter(f => f.endsWith('.mdx'))) {
  const slug = file.replace('.mdx', '')
  if (!content[slug]) continue

  const path = join(dir, file)
  const text = readFileSync(path, 'utf8')
  const fmEnd = text.indexOf('\n---\n', 3) + 5
  const frontmatter = text.slice(0, fmEnd)

  // Extrahovat info z frontmatteru
  const rapperMatch = text.match(/rapper:\s*"([^"]+)"/)
  const rapperSlugMatch = text.match(/rapperSlug:\s*"([^"]+)"/)
  const artist = rapperMatch ? rapperMatch[1] : 'rapper'
  const artistSlug = rapperSlugMatch ? rapperSlugMatch[1] : slug

  const newBody = `\n\n${content[slug].text}\n\nVíce od [${artist}](/raperi/${artistSlug}).\n`
  writeFileSync(path, frontmatter + newBody, 'utf8')
  updated++
}

console.log(`✅ Opraveno a rozšířeno ${updated} zbývajících alb`)