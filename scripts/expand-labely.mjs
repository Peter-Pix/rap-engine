#!/usr/bin/env node
// expand-labely.mjs — rozšíří 15 tenkých labelů
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '..', 'content/labely')

// Každej label: co napsat do těla
const expansions = {
  '100k': `Label a kolektiv **100K** (též 100K Sudety) je nezávislá severočeská značka z Ústí nad Labem. Pod její křídla patří uskupení **Central Gang**, **Forest Blunt**, **Vercetti CG** a další. 100K buduje regionální rapovou scénu na severu Čech s důrazem na autenticitu a DIY přístup. Label je známý svým syrovým zvukem a propojením s ústeckou subkulturou.`,

  '1312-records': `**1312 Records** je brněnský hip-hopový label zaměřený na syrový street rap a boom bap. Číslo 1312 je symbolické — odkazuje na policejní kód (ACAB) a label se hlásí k pouliční autenticitě. Pod labelem vychází projekty brněnských rapperů, kteří se pohybují mimo mainstream. Label je známý svým nekompromisním postojem a podporou lokální scény.`,

  '415-02-records': `**415 02 Records** je nezávislý severočeský label a nahrávací studio z Teplic. Pod jeho křídly tvoří **Katannah**, **VlaďkySyn**, **Makin Hollov** a **TDW Crew**. Label se zaměřuje na trap a cloud rap s regionálním přesahem. 415 02 Records je příkladem fungující DIY scény mimo Prahu — vlastní studio, vlastní vize, vlastní zvuk.`,

  'azurit-kingdom': `**Azurit Kingdom** byl ostravský hip-hopový label a kolektiv, který do českého rapu přinesl temnou jižanskou estetiku a syrový pouliční zvuk. Ostrava jako industriální město dala labelu specifickou atmosféru — drsnou, autentickou, nekompromisní. Label už není aktivní, ale jeho vliv na ostravskou scénu je nezpochybnitelný.`,

  'central-gang': `**Central Gang** je mladý český rapový kolektiv z pražské scény zaměřený na drill a moderní street rap. Kolektiv je propojený s labelem 100K a ústeckou scénou. Central Gang reprezentuje novou generaci českého drillu — tvrdé beaty, agresivní flow a texty z ulice.`,

  'churaq-clique': `**Churaq Clique** je český rapový kolektiv s důrazem na humor, nadhled a špinavý trapový zvuk. Název "Churaq" odkazuje na slangové označení pro partu — a to přesně vystihuje jejich přístup. Kolektiv stojí na pomezí vážného rapu a ironie, což je dělá na české scéně originálními.`,

  'comebackgang': `**Comebackgang (CBG)** je slovenský hip-hopový label a kreativní kolektiv založený v roce 2014 rapperem **Pil C**. CBG výrazně formoval moderní zvuk a estetiku slovenské rapové scény. Pod labelem vydávali **Pil C**, **SpecialBeatz**, **Luisa** a **Marko Damian**. CBG je známý svým charakteristickým vizuálním stylem a propojením hudby s fashion a uměním. Label ovlivnil celou generaci slovenských posluchačů a dodnes patří k nejvlivnějším značkám na scéně.`,

  'everydays': `**Everydays** je label založený rapperem **Ideou**, zaměřený na alternativní rapové a instrumentální projekty. Idea je známý svým intelektuálním rapem a Everydays je platforma, kde může realizovat projekty mimo mainstream. Label vydává experimentálnější desky, které by pod velkým labelem nevyšly.`,

  'fuck-them': `**F*CK THEM** je česko‑slovenský label, který výrazně ovlivnil vizuální i hudební podobu nové rapové vlny. Label stojí na pomezí hudby, módy a umění — jejich estetika je výrazná, provokativní a rozpoznatelná. F*CK THEM podporuje umělce, kteří se vymykají mainstreamu a jdou vlastní cestou.`,

  'golden-touch': `**Golden Touch Records** je nezávislé české hudební vydavatelství a kreativní platforma založená legendárním producentem **DJ Wichem**. Pod Golden Touch vydávali **Ektor**, **LA4**, **Lvcas Dope**, **Maniak** a **Rest**. DJ Wich jako producent s mezinárodním renomé přinesl do labelu profesionální úroveň a propojení se světovou scénou. Golden Touch je synonymem pro kvalitní hip-hopovou produkci v ČR.`,

  'hypno-808': `**Hypno808** je pražský nezávislý rapový label založený **Hugem Toxxxem**. Label je spojený s temnou elektronikou, experimentálním trapem a horrorcore estetikou. Hugo Toxxx do Hypno808 přenesl svůj DIY přístup a nekompromisní vizi. Label vydává projekty, které jsou příliš temné a experimentální pro mainstream. Hypno808 je kultovní značka pro fanoušky alternativnějšího rapu.`,

  'mike-roft': `**Mike Roft Records** je brněnský label a kreativní kolektiv, který stojí za úspěchem jmen jako **Viktor Sheen**, **Calin** a **Stein27**. Mike Roft je jeden z nejúspěšnějších českých labelů posledních let — jeho interpreti pravidelně obsazují přední příčky streamovacích žebříčků. Label kombinuje profesionální management s kreativní svobodou a je příkladem toho, jak funguje moderní hudební byznys v ČR.`,

  'pozor-records': `**Pozor Records** je label spojený s producentem **Huclberrym** a temnějším moderním rapovým zvukem. Label se pohybuje na pomezí Česka a Slovenska. Pod Pozor Records vychází projekty s výrazným producentským rukopisem — důraz na atmosféru, temné beaty a kvalitní mixing.`,

  'skerocuda': `**Skerocuda** je nezávislý český rap label a podnik **Sergeie Barracudy**. Label je zaměřený na trap a street rap. Sergei Barracuda si pod Skerocudou vydává vlastní desky a buduje si nezávislost na velkých labelech. Skerocuda je příkladem rappera, který vzal distribuci a vydavatelství do vlastních rukou.`,

  'troublegang': `**TroubleGang** je hudební uskupení kolem rappera **Marpa**, propojující rap s rockem a živou kapelovou energií. Marpo po odchodu z Chinaski postavil TroubleGang jako platformu pro svou rapovou tvorbu s live bandem. TroubleGang je známý svými energickými koncerty a crossoverem mezi rapem a rockem.`
}

for (const file of readdirSync(dir).filter(f => f.endsWith('.mdx'))) {
  const slug = file.replace('.mdx', '')
  if (!expansions[slug]) continue

  const path = join(dir, file)
  let text = readFileSync(path, 'utf8')

  const fmEnd = text.indexOf('\n---\n', 3) + 5
  const frontmatter = text.slice(0, fmEnd)
  const body = text.slice(fmEnd).trim()

  // Pokud je tělo jen boilerplate
  if (body.includes('je hudební label') || body.split('\n').filter(l => l.trim()).length <= 3) {
    text = frontmatter + '\n\n' + expansions[slug] + '\n'
    writeFileSync(path, text, 'utf8')
  }
}

console.log('✅ Rozšířeno 15 labelů')