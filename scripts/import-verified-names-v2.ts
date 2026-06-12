/**
 * Import druhé dávky ověřených dat (30 artistů) do meta.json
 * Spouštět: npx tsx scripts/import-verified-names-v2.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENTITIES_DIR = join(ROOT, 'content', 'entities');

interface Rapper {
  prezdivka: string;
  prave_jmeno: string | null;
  mesto: string | null;
  datum_narozeni: string | null;
  rok_narozeni: number | null;
  narodnost: 'CZ' | 'SK';
  overeno: string;
  poznamka: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function stageNameToSlug(stageName: string): string {
  const special: Record<string, string> = {
    'James Cole': 'james-cole',
    'Orion': 'orion',
    'Indy': 'indy',
    'Řezník': 'reznik',
    'Paulie Garand': 'paulie-garand',
    'Renne Dang': 'renne-dang',
    'Robin Zoot': 'robin-zoot',
    'Tafrob': 'tafrob',
    'Hasan': 'hasan',
    'Idea': 'idea',
    'Ca$hanova Bulhar': 'ca-hanova-bulhar',
    'Lvcas Dope': 'lvcas-dope',
    'Protiva': 'protiva',
    'Kato': 'kato',
    'Vec': 'vec',
    'Čistychov': 'cistychov',
    'Majself': 'majself',
    'Momo': 'momo',
    'Supa': 'supa',
    'Delik': 'delik',
    'Gleb': 'gleb',
    'Sensey': 'sensey',
    'Refew': 'refew',
    'MC Gey': 'mc-gey',
    'Samey': 'samey',
    'Maniak': 'maniak',
    'Jickson': 'jickson',
    'Otecko': 'otecko',
    'Zayo': 'zayo',
    'Dorian': 'dorian',
  };
  return special[stageName] ?? slugify(stageName);
}

const rapperi: Rapper[] = [
  { prezdivka: "James Cole", prave_jmeno: "Daniel Ďurech", mesto: "Brandýs nad Labem", datum_narozeni: "1984-02-20", rok_narozeni: 1984, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Supercrooo (s Hugo Toxxxem); žije na pražském Žižkově. Část zdrojů chybně uvádí Beroun." },
  { prezdivka: "Orion", prave_jmeno: "Michal Opletal", mesto: "Náchod", datum_narozeni: "1976-06-21", rok_narozeni: 1976, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Zakladatel PSH. Část zdrojů uvádí Prahu, Wikipedie/ČSFD uvádí Náchod." },
  { prezdivka: "Indy", prave_jmeno: "Andreas Christodoulou", mesto: "Kutná Hora", datum_narozeni: "1978-01-20", rok_narozeni: 1978, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Indy & Wich; otec z Kypru." },
  { prezdivka: "Řezník", prave_jmeno: "Martin Pohl", mesto: "Rumburk", datum_narozeni: "1986-10-01", rok_narozeni: 1986, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Horrorcore; Sodoma Gomora (jako M.Engele); label ZNK." },
  { prezdivka: "Paulie Garand", prave_jmeno: "Pavel Harant", mesto: "Liberec", datum_narozeni: "1987-10-17", rok_narozeni: 1987, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Label Ty Nikdy; dříve projekt BPM." },
  { prezdivka: "Renne Dang", prave_jmeno: "René Dang", mesto: "Rychnov nad Kněžnou", datum_narozeni: "1995-02-24", rok_narozeni: 1995, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Vietnamské kořeny; label Blakkwood Records." },
  { prezdivka: "Robin Zoot", prave_jmeno: "Robert Pouzar", mesto: "Ústí nad Labem", datum_narozeni: "1991-08-18", rok_narozeni: 1991, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Label Milion+ Entertainment." },
  { prezdivka: "Tafrob", prave_jmeno: "Pavel Sup", mesto: "Brno", datum_narozeni: "1982-10-05", rok_narozeni: 1982, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Freestyle; dříve skupina Zlomenej Waz / ZW Cirkus." },
  { prezdivka: "Hasan", prave_jmeno: "Josef Andreas", mesto: "Tábor", datum_narozeni: "1997-05-06", rok_narozeni: 1997, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Label Milion+; cloud rap." },
  { prezdivka: "Idea", prave_jmeno: "Josef Změlík", mesto: "Zlín", datum_narozeni: "1986-02-14", rok_narozeni: 1986, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Rapper a producent; zakladatel labelu Ty Nikdy." },
  { prezdivka: "Ca$hanova Bulhar", prave_jmeno: "Matěj Kratejl", mesto: "Praha", datum_narozeni: "1994-06-24", rok_narozeni: 1994, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Pochází z pražských Strašnic; narozen jako Matěj Svoboda, příjmení po otci změnil na Kratejl. Crew Dvojlitrboyzz." },
  { prezdivka: "Lvcas Dope", prave_jmeno: "Lukáš Navrátil", mesto: "Cheb", datum_narozeni: "1994-02-13", rok_narozeni: 1994, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Česko-turecký původ; od r. 2021 vlastním jménem Lukas Çakmak. Spoluzakladatel 420xYZO / Milion+. Část zdrojů uvádí Prahu, Wikipedie/CzWiki uvádí Cheb." },
  { prezdivka: "Protiva", prave_jmeno: "Pavel Protiva", mesto: "Jindřichův Hradec", datum_narozeni: "1997-09-04", rok_narozeni: 1997, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Zemřel 7. 10. 2024 v Praze. Label Blakkwood Records; další pseudonymy Paya, Zel Dox aj." },
  { prezdivka: "Kato", prave_jmeno: "Adam Svatoš", mesto: "Praha", datum_narozeni: "1979-06-16", rok_narozeni: 1979, narodnost: "CZ", overeno: "jmeno+datum+mesto", poznamka: "Prago Union (dříve Deph ve skupině Chaozz)." },
  { prezdivka: "Vec", prave_jmeno: "Branislav Kováč", mesto: "Zlaté Moravce", datum_narozeni: "1976-01-31", rok_narozeni: 1976, narodnost: "SK", overeno: "jmeno+datum+mesto", poznamka: "Legenda SK rapu; dříve skupina Trosky; žije v Bratislavě." },
  { prezdivka: "Čistychov", prave_jmeno: "Daniel Chládek", mesto: "Bratislava", datum_narozeni: null, rok_narozeni: 1981, narodnost: "SK", overeno: "jmeno+mesto", poznamka: "Vyrostl v Petržalce; od r. 2018 vystupuje jako Čis T. Skupiny L.U.Z.A. a Názov Stavby. Veřejně doložen jen rok narození." },
  { prezdivka: "Majself", prave_jmeno: "Michal Švehla", mesto: "Bratislava", datum_narozeni: "1987-02-07", rok_narozeni: 1987, narodnost: "SK", overeno: "jmeno+datum+mesto", poznamka: "Vyrůstal ve Stupavě." },
  { prezdivka: "Momo", prave_jmeno: "Roman Grigely", mesto: "Bratislava", datum_narozeni: "1988-01-08", rok_narozeni: 1988, narodnost: "SK", overeno: "jmeno+datum+mesto", poznamka: "Pochází z Petržalky; dříve eMO2; člen skupiny XIV (Štrnásť)." },
  { prezdivka: "Supa", prave_jmeno: "Vladimír Dupkala", mesto: "Handlová", datum_narozeni: "1980-07-18", rok_narozeni: 1980, narodnost: "SK", overeno: "jmeno+datum+mesto", poznamka: "Skupina Moja Reč." },
  { prezdivka: "Delik", prave_jmeno: "Michal Pastorok", mesto: "Handlová", datum_narozeni: "1982-11-29", rok_narozeni: 1982, narodnost: "SK", overeno: "jmeno+datum+mesto", poznamka: "Skupina Moja Reč; dříve Michadelik." },
  { prezdivka: "Gleb", prave_jmeno: "Gleb Veselov", mesto: "Pjatigorsk (RU)", datum_narozeni: "1991-12-03", rok_narozeni: 1991, narodnost: "SK", overeno: "jmeno+datum+mesto", poznamka: "Ruský původ, na Slovensko se rodina přestěhovala, když mu byl rok; žije v Bratislavě. Grime / DnB." },
  { prezdivka: "Sensey", prave_jmeno: "Vojtěch Prell", mesto: null, datum_narozeni: "1997-04-29", rok_narozeni: 1997, narodnost: "CZ", overeno: "jmeno+datum", poznamka: "Také Sensey Syfu / Sensey Bratan. Město narození není veřejně doložené." },
  { prezdivka: "Refew", prave_jmeno: "Erik Gábor", mesto: "Praha", datum_narozeni: null, rok_narozeni: 1993, narodnost: "CZ", overeno: "jmeno+mesto", poznamka: "Vyrostl v pražské Libni (Palmovka). Label Blakkwood (dříve Bigg Boss). Přesné datum se ve zdrojích rozchází (30.1.1993 vs 30.10.1993), proto je vyplněn jen rok." },
  { prezdivka: "MC Gey", prave_jmeno: "Jakub Rafael", mesto: "Pardubice", datum_narozeni: null, rok_narozeni: null, narodnost: "CZ", overeno: "jmeno+mesto", poznamka: "Rodák z Pardubic, žije v Brně; label Ty Nikdy. Přesné datum narození není veřejné (dle uváděného věku přibližně ročník 1986/1987 – neověřeno)." },
  { prezdivka: "Samey", prave_jmeno: "Samuel Sadiv", mesto: "Košice", datum_narozeni: null, rok_narozeni: null, narodnost: "SK", overeno: "jmeno+mesto", poznamka: "Skupina Haha Crew. Přesné datum narození není veřejné (dle textu pravděpodobně ročník 1994 – neověřeno z oficiálního zdroje)." },
  { prezdivka: "Maniak", prave_jmeno: "Jiří Veselý", mesto: "Brno", datum_narozeni: null, rok_narozeni: null, narodnost: "CZ", overeno: "jmeno+mesto", poznamka: "Ruská matka, český otec, čas strávil v Omsku. Label Bigg Boss. Datum narození není veřejné." },
  { prezdivka: "Jickson", prave_jmeno: "Jiří Bortel", mesto: null, datum_narozeni: null, rok_narozeni: null, narodnost: "CZ", overeno: "jmeno", poznamka: "Také Jimmy Dickson / Jimmy D.; YZO Empire / Milion+. Datum narození ani město nejsou veřejně doložené." },
  { prezdivka: "Otecko", prave_jmeno: "Branislav Korec", mesto: "Bratislava", datum_narozeni: null, rok_narozeni: null, narodnost: "SK", overeno: "jmeno+mesto", poznamka: "Skupina H16. Datum narození není veřejně doložené." },
  { prezdivka: "Zayo", prave_jmeno: "Matúš Zajac", mesto: "Košice", datum_narozeni: null, rok_narozeni: null, narodnost: "SK", overeno: "jmeno+mesto", poznamka: "Skupina Haha Crew. Datum narození není veřejně doložené." },
  { prezdivka: "Dorian", prave_jmeno: "David Albrecht", mesto: "Praha", datum_narozeni: null, rok_narozeni: null, narodnost: "CZ", overeno: "jmeno+mesto", poznamka: "Pražský rapper původem z Krkonoš; dříve D.A.; dříve label Blakkwood. Datum narození není veřejné." },
];

let updated = 0;
let created = 0;
let skipped = 0;

for (const r of rapperi) {
  const slug = stageNameToSlug(r.prezdivka);
  const entityDir = join(ENTITIES_DIR, `artist_${slug}`);

  if (existsSync(entityDir)) {
    // ── Existující entita: updatni meta.json ──
    const metaPath = join(entityDir, 'meta.json');
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));

    let changed = false;

    if (r.prave_jmeno && !meta.realName) {
      meta.realName = r.prave_jmeno;
      changed = true;
    }
    if (r.mesto && !meta.origin) {
      meta.origin = r.mesto;
      changed = true;
    }
    if (r.datum_narozeni && !meta.birthDate) {
      meta.birthDate = r.datum_narozeni;
      changed = true;
    }
    // Always add note if missing (has metadata value)
    if (r.poznamka && !meta.note) {
      meta.note = r.poznamka;
      changed = true;
    }

    if (changed) {
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
      updated++;
      console.log(`✓ UPDATED ${slug}: ${r.prave_jmeno || '(no realName)'} | ${r.mesto || ''} | ${r.datum_narozeni || ''}`);
    } else {
      skipped++;
    }
  } else {
    // ── Nová entita: vytvoř kompletní stub ──
    mkdirSync(entityDir, { recursive: true });

    const meta: Record<string, unknown> = {
      id: `artist_${slug}`,
      type: 'artist',
      slug,
      title: r.prezdivka,
      description: 'Umělec',
      publishedAt: '2026-06-12',
    };
    if (r.prave_jmeno) meta.realName = r.prave_jmeno;
    if (r.mesto) meta.origin = r.mesto;
    if (r.datum_narozeni) meta.birthDate = r.datum_narozeni;
    if (r.poznamka) meta.note = r.poznamka;

    writeFileSync(join(entityDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

    writeFileSync(join(entityDir, 'entity.mdx'), [
      '---',
      `title: "${r.prezdivka}"`,
      `slug: "${slug}"`,
      `type: "artist"`,
      `description: "Umělec"`,
      `publishedAt: "2026-06-12"`,
      '---',
      '',
    ].join('\n'));

    writeFileSync(join(entityDir, 'relations.json'), JSON.stringify({
      albums: [], artists: [], genres: [], influencedBy: [], labels: [],
      locations: [], moods: [], partOf: [], related: [], scenes: [],
      styles: [], themes: [], tracks: []
    }, null, 2) + '\n');

    created++;
    console.log(`✦ CREATED ${slug} (${r.prezdivka})`);
  }
}

console.log(`\n=== Results ===`);
console.log(`  Updated: ${updated}`);
console.log(`  Created: ${created}`);
console.log(`  Skipped (no changes): ${skipped}`);
console.log(`  Total: ${updated + created + skipped} / ${rapperi.length}`);