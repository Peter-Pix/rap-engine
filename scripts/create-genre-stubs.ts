#!/usr/bin/env npx tsx
/**
 * Create stub genre entities for dangling genre references.
 * These genres exist as values in frontmatter but not as standalone entities.
 */

import fs from "node:fs";
import path from "node:path";

const ENTITIES_DIR = path.join(process.cwd(), "content", "entities");

// ─── Dangling genres from validation ────────────────────
const DANGLING_GENRES: Record<string, { description: string; related?: string[] }> = {
  "electronic": { description: "Elektronická hudba — vliv na hip-hop produkci, experimentální rap a syntetické beaty.", related: ["hip-hop", "trap", "experimental-rap"] },
  "neo-soul": { description: "Neo-soul — hladká R&B fúze s hip-hopem, ovlivňuje melodický rap a autotune vokály.", related: ["r-n-b", "soul", "trap"] },
  "r-n-b": { description: "R&B / Rhythm and Blues — těsně spjatý s melodickým rapem, zpěvné hooky a emocionální témata.", related: ["neo-soul", "trap", "pop-rap"] },
  "nu-metal": { description: "Nu-metal — fúze rapu a metalu, agresivní kytary s rapovanými vokály.", related: ["rap-metal", "rock-rap", "trap-metal"] },
  "world": { description: "World music — etnické vlivy a globální zvuky v hip-hopové produkci.", related: ["oriental-rap", "afro-rap", "dancehall"] },
  "new-wave": { description: "New wave — post-punkový vliv na alternativní rap a experimentální produkci.", related: ["alternative-hip-hop", "indie-rap", "experimental-rap"] },
  "social-commentary": { description: "Social commentary rap — rap zaměřený na sociální kritiku, politiku a společenská témata.", related: ["conscious-rap", "political-rap", "street-rap"] },
  "garage-punk": { description: "Garage punk — syrový punkový zvuk s hip-hopovými elementy.", related: ["punk", "hardcore-punk", "rap-rock"] },
  "political-punk": { description: "Political punk — punk s politickým poselstvím, často se sociální kritikou.", related: ["punk", "political-rap", "conscious-rap"] },
  "pluggnb": { description: "PluggnB — subžánr trapu s R&B melodiemi, popularizovaný na SoundCloudu.", related: ["trap", "r-n-b", "cloud-rap"] },
  "phonk": { description: "Phonk — temný Memphis-inspirovaný trap s vintage samply a cowbells.", related: ["trap", "drill", "memphis-rap"] },
  "rage-rap": { description: "Rage rap — agresivní, distorted trap s punkovou energií (Trippie Redd, Playboi Carti).", related: ["trap", "trap-metal", "pluggnb"] },
  "indie-pop": { description: "Indie pop — nezávislý pop s hip-hopovými vlivy, DIY estetika.", related: ["pop-rap", "indie-rap", "alternative-hip-hop"] },
  "indie-rap": { description: "Indie rap — nezávislý rap mimo mainstream, DIY produkce a experimentální zvuk.", related: ["alternative-hip-hop", "underground-rap", "boom-bap"] },
  "old-school-cz": { description: "Old school český rap — klasický český hip-hop z 90. let a počátku 2000s.", related: ["czech-rap", "boom-bap", "golden-era"] },
  "battle-rap": { description: "Battle rap — freestyle soutěžní rap, diss kultura a wordplay.", related: ["freestyle-rap", "diss", "underground-rap"] },
  "spiritual-rap": { description: "Spiritual rap — rap s duchovními, mystickými nebo filosofickými tématy.", related: ["mystical-rap", "conscious-rap", "meditation-rap"] },
  "world-music": { description: "World music v rapu — globální etnické vlivy a fúze.", related: ["afro-rap", "oriental-rap", "dancehall"] },
  "rap-rock": { description: "Rap rock — fúze rapu a rockové hudby.", related: ["nu-metal", "rock-rap", "punk-rap"] },
  "latin-trap": { description: "Latin trap — španělskojazyčný trap s reggaetonovými vlivy.", related: ["reggaeton", "trap", "dancehall"] },
  "bounce": { description: "Bounce — rytmický New Orleans styl, vliv na southern rap.", related: ["southern-rap", "trap", "crunk"] },
  "poetry-slam": { description: "Poetry slam — spoken word performance, blízký hip-hopové lyrice.", related: ["spoken-word", "conscious-rap", "boom-bap"] },
  "hip-hop-production": { description: "Hip-hop production — zaměření na beatmaking, sampling a produkční techniky.", related: ["boom-bap", "trap", "sample-based"] },
  "club-rap": { description: "Club rap — taneční rap pro kluby, high energy a party atmosféra.", related: ["trap", "party-rap", "hyphy"] },
  "dubstep": { description: "Dubstep — vliv wobblů a bassů na elektronickou hip-hop produkci.", related: ["electronic", "trap", "bass-music"] },
};

// ─── Create stub entities ───────────────────────────────
let created = 0;
let skipped = 0;

for (const [slug, data] of Object.entries(DANGLING_GENRES)) {
  const id = `genre_${slug}`;
  const dir = path.join(ENTITIES_DIR, id);

  if (fs.existsSync(dir)) {
    skipped++;
    continue;
  }

  fs.mkdirSync(dir, { recursive: true });

  const meta = {
    id,
    type: "genre",
    title: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/R n b/i, "R&B").replace(/R N B/i, "R&B"),
    description: data.description,
    slug,
    publishedAt: new Date().toISOString().split("T")[0],
    // Some genres are actually styles/moods — mark as genre for now
    isStub: true,
  };

  const relations: Record<string, string[]> = {};
  if (data.related && data.related.length > 0) {
    relations.genres = data.related.map(r => `genre_${r}`);
  }

  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2));
  fs.writeFileSync(
    path.join(dir, "entity.mdx"),
    `---\ntitle: "${meta.title}"\n---\n\n# ${meta.title}\n\n${data.description}\n\n*\u003csmall\u003eToto je základní entita (stub) — obsah bude doplněn později.\u003c/small\u003e*\n`,
  );

  created++;
}

console.log(`🎵 Genre stubs: ✅ ${created} created, ⏭️ ${skipped} skipped`);
console.log("Run 'npm run cache:build' to rebuild.");
