#!/usr/bin/env -S npx tsx
/**
 * FÁZE 2 — Založení producentských entit z ověřených dat Rap Monitoru.
 *
 * Každý producent má data z RM: s kým produkoval, na jakých albech, v jakých letech,
 * na jakých labelech. Nic se nevymýšlí — jen se strukturovaně zapíše.
 *
 * Bezpečnost: idempotentní (existující slug → skip), DRY_RUN default,
 * nové entity startují s `noindex: true` (stub dokud nemají vlastní obsah).
 *
 * Použití:
 *   npx tsx scripts/create-producer-entities.ts
 *   DRY_RUN=0 npx tsx scripts/create-producer-entities.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";
const TODAY = new Date().toISOString().slice(0, 10);

type Producer = {
  slug: string;
  title: string;
  description: string;
  artists: string[];   // artist_* slugy s ověřenou spoluprací
  labels: string[];    // label_* slugy
  years: string;
  genres: string[];
  locations: string[];
  body: string;        // MDX (po frontmatteru)
};

const PRODUCERS: Producer[] = [
  {
    slug: "marcus-tran",
    title: "Marcus Tran",
    description: "Producent a mix inženýr, klíčová postava zvuku Marpa. Stojí za deskami Backwoods Breed, Dead Man Walking i Rapstar a drží sound jednoho z nejúspěšnějších českých rapperů napříč dekádou.",
    artists: ["artist_marpo"],
    labels: ["label_universal-music", "label_pvp-label"],
    years: "2012–2024",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**Marcus Tran** je producent a mix inženýr, nejtěsněji spojený s tvorbou [Marpa](/raperi/marpo). Jeho podpis nese zvuk prakticky celé Marpovy dospělé diskografie — od raných desek až po současnost.

### 🤝 Spolupráce

Produkoval skladby na albech [Marpa](/raperi/marpo):

- **Bad Man** (2016)
- **Dead Man Walking** (2018)
- **Backwoods Breed** (2021)
- **Rapstar** (2024)

Spolu s [Clintem Murphym](/producenti/clint-murphy) patří k stabilní produkční dvojici Marpova týmu.`,
  },
  {
    slug: "clint-murphy",
    title: "Clint Murphy",
    description: "Producent, který formoval zvuk Marpa od alba Původ Umění po Rapstar. Specialista na tvrdý, epický sound s důrazem na mix a mastering.",
    artists: ["artist_marpo"],
    labels: ["label_universal-music", "label_pvp-label"],
    years: "2013–2024",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**Clint Murphy** je producent, který stojí za zvukem [Marpa](/raperi/marpo) prakticky od začátku jeho sólové kariéry. Podílel se na klíčových deskách, které Marpa etablovaly jako jednoho z nejprodávanějších českých rapperů.

### 🤝 Spolupráce

Produkoval skladby na albech [Marpa](/raperi/marpo):

- **Původ Umění** (2013)
- **Dead Man Walking** (2018)
- **Backwoods Breed** (2021)
- **Rapstar** (2024)

Často spolupracuje s [Marcusem Tranem](/producenti/marcus-tran).`,
  },
  {
    slug: "stepan-hebik",
    title: "Štěpán Hebík",
    description: "Producent spojený s projektem 7krát3 a labelem Championship Music. Podílel se na albech I a II, která definovala zvuk tohoto uskupení.",
    artists: ["artist_7krat3"],
    labels: ["label_championship-music", "label_biggboss"],
    years: "2022",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**Štěpán Hebík** je producent, který se podílel na zvuku projektu [7krát3](/raperi/7krat3) — uskupení kolem [Mikea Trafika](/raperi/mike-trafik) a [Vladimira 518](/raperi/vladimir-518).

### 🤝 Spolupráce

Produkoval skladby na albech [7krát3](/raperi/7krat3):

- **I** (2022) — "Hledám někoho"
- **II** (2022) — "Když to mám nabitý"

Pohybuje se v okruhu labelu Championship Music.`,
  },
  {
    slug: "stepan-turek",
    title: "Štěpán Turek",
    description: "Producent podílející se na deskách 7krát3 pro label BiggBoss. Spolutvůrce zvuku alba I a singlu Headphones.",
    artists: ["artist_7krat3"],
    labels: ["label_biggboss", "label_championship-music"],
    years: "2022",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**Štěpán Turek** je producent, který se podílel na debutových deskách projektu [7krát3](/raperi/7krat3).

### 🤝 Spolupráce

Produkoval skladby na albech [7krát3](/raperi/7krat3):

- **I** (2022) — "Roky", "Boh dal love"
- **Headphones** (2022)
- **II** (2022) — "Azuro"

Působí v okruhu labelu BiggBoss.`,
  },
  {
    slug: "ondrej-fiedler",
    title: "Ondřej Fiedler",
    description: "Producent spojený s Johny Machettem a jeho albem Snílek. Podílel se na zvuku jednoho z nejvýraznějších českých rapových projektů 10. let.",
    artists: ["artist_johny-machette"],
    labels: ["label_universal-music"],
    years: "2014–2017",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**Ondřej Fiedler** (též *fiedlerski*) je producent spojený s tvorbou [Johnyho Machetteho](/raperi/johny-machette).

### 🤝 Spolupráce

Produkoval skladby [Johnyho Machetteho](/raperi/johny-machette):

- **Snílek** (2015) — "Vítězství", "Spasitelé"
- "Vánoční" (feat. [Teri Blitzen](/raperi/teri-blitzen))

Podílel se také na tracku "Loterie" pro [Annet X](/raperi/annet-x).`,
  },
  {
    slug: "ondrej-zatkuliak",
    title: "Ondřej Žatkuliak",
    description: "Producent spolupracující s Johny Machettem i Marpem. Jeho práce sahá od alba Snílek po Lone Survivor.",
    artists: ["artist_johny-machette", "artist_marpo"],
    labels: [],
    years: "2014–2016",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**Ondřej Žatkuliak** je producent působící napříč českou rapovou scénou.

### 🤝 Spolupráce

- [Johny Machette](/raperi/johny-machette) — **Snílek** (2015) — "Ona Říká", "Snílek"
- [Marpo](/raperi/marpo) — **Lone Survivor** (2016) — "Nic Nekončí"`,
  },
  {
    slug: "igor-ochepovsky",
    title: "Igor Ochepovsky",
    description: "Producent a kytarista podílející se na zvuku projektu 7krát3 pro label BiggBoss.",
    artists: ["artist_7krat3"],
    labels: ["label_biggboss"],
    years: "2022",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**Igor Ochepovsky** je producent a instrumentalista, který se podílel na zvuku projektu [7krát3](/raperi/7krat3).

### 🤝 Spolupráce

Spoluprodukoval s [Štěpánem Turkem](/producenti/stepan-turek) skladby na albu **I** (2022) — "Roky", "Azuro (interlude)".`,
  },
  {
    slug: "homiebeats",
    title: "HomieBeats",
    description: "Producent spolupracující s Johny Machettem a labelům Championship Music a Bookin Agency.",
    artists: ["artist_johny-machette"],
    labels: ["label_championship-music"],
    years: "2013–2015",
    genres: ["genre_hip-hop"],
    locations: ["location_cesko"],
    body: `## O producentovi

**HomieBeats** je producent, který se podílel na rané tvorbě [Johnyho Machetteho](/raperi/johny-machette).

### 🤝 Spolupráce

- "Tenkrát" (prod. by HomieBeats, 2013)
- **Snílek** (2015) — "Všední Den"`,
  },
];

// ── Validace referencí ──────────────────────────────────────────────────────
const existing = new Set(fs.readdirSync(ENTITIES));
const problems: string[] = [];
for (const p of PRODUCERS) {
  const dir = `producer_${p.slug}`;
  for (const a of [...p.artists, ...p.labels]) {
    if (!existing.has(a)) problems.push(`${p.slug}: chybí cíl ${a}`);
  }
}
if (problems.length) {
  console.log("⚠️ Neplatné reference (entita neexistuje):");
  for (const x of problems) console.log("   " + x);
}

// ── Zápis ──────────────────────────────────────────────────────────────────
let created = 0, skipped = 0;
for (const p of PRODUCERS) {
  const dir = path.join(ENTITIES, `producer_${p.slug}`);
  if (fs.existsSync(dir)) { skipped++; console.log(`   skip (existuje): producer_${p.slug}`); continue; }

  const meta = {
    id: `producer_${p.slug}`,
    type: "producer",
    slug: p.slug,
    title: p.title,
    description: p.description,
    publishedAt: TODAY,
    activeSince: p.years.split("–")[0],
    origin: "Česko",
    status: "published",
  };
  const relations = {
    artists: p.artists,
    albums: [],
    genres: p.genres,
    labels: p.labels,
    locations: p.locations,
    moods: [],
    partOf: [],
    related: [],
    scenes: [],
    styles: [],
    themes: [],
    tracks: [],
  };
  const mdx = `---
id: producer_${p.slug}
type: producer
title: "${p.title}"
status: published
---

${p.description}

${p.body}
`;
  if (DRY_RUN) { created++; console.log(`   [DRY] producer_${p.slug}`); continue; }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "entity.mdx"), mdx);
  created++;
}

console.log(`\n${DRY_RUN ? "[DRY-RUN] " : ""}Vytvořeno: ${created} · přeskočeno: ${skipped}`);
