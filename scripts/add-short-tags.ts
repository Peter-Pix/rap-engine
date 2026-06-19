/**
 * Přidá `shortTag` do profile.json pro top 20 rapperů.
 *
 * Tagy jsou **kurátorem schválené** (Peter), ne AI-generované.
 * Cíl: nahradit generický AI hook (`oneLiner`) specifickým, autoritativním textem.
 *
 * Idempotentní — pokud shortTag existuje, nepřepíše (pokud nepředáš --force).
 *
 * Usage:
 *   npx tsx scripts/add-short-tags.ts           # přidá chybějící
 *   npx tsx scripts/add-short-tags.ts --force   # přepíše všechny
 *   npx tsx scripts/add-short-tags.ts --dry-run # ukáže co by udělal
 */

import fs from "node:fs";
import path from "node:path";

// ═══════════════════════════════════════════════════════════════════════════
// Top 20 rapperů + originální tagy (schválené kurátorem)
// ═══════════════════════════════════════════════════════════════════════════

const TAGS: Record<string, string> = {
  // 1
  ektor: "Moravský těžkej kalibr. V Brně se nezastavil, v Praze se prosadil.",
  // 2
  "dj-wich": "DJ Wich neprodukuje hudbu, DJ Wich produkuje hity.",
  // 3
  adiss: "Slovenskej mistr flow. ADiss nedělá hudbu, dělá texty.",
  // 4
  dalyb: "Ze sídliště v Košicích na velký pódia. Dalyb to dokázal.",
  // 5
  rest: "Rest není rapper pro každýho. A právě proto funguje.",
  // 6
  michajlov: "Hardcore srdce moravský scény. Michajlov neuhne.",
  // 7
  "ben-cristovao": "Z Humpolce na největší podia. Ben Cristovao zvládl obojí.",
  // 8
  "d-kop": "Z Chebu na vrchol. D.Kop nikdy neztratil svůj zvuk.",
  // 9
  maniak: "Brno není Praha. A Maniak není typ rappera, který by se za to omlouval.",
  // 10
  "hugo-toxxx": "Průkopník. Když Hugo začínal, český rap ještě neměl pravidla. On je psal.",
  // 11
  "paulie-garand": "Nejpracovitější rapper v zemi. Paulie Garand nikdy neodejde do důchodu.",
  // 12
  saul: "Slovenský rap sám o sobě. Saul ho reprezentuje léta.",
  // 13
  astralkid22: "Mladej ale starej v hlavě. AstralKid22 má flow starýho psa.",
  // 14
  cistychov: "Bratislavská poetika, hluboká lyrika.",
  // 15
  "kamil-hoffmann": "Slovenskej vypravěč s citem pro detail.",
  // 16
  arleta: "Jediná žena, která se v CZ/SK rapu prosadila bez kompromisu.",
  // 17
  dokkeytino: "Slovenskej rapper s moravskou příchutí. Dokkeytino spojuje.",
  // 18
  kali: "Bratislavská legenda. Kali píše o ulici, ale žije literaturou.",
  // 19
  reznik: "Horrorcore král. Řezník dělá zlá slova uměním.",
  // 20
  labello: "Pražská jistota. Labello nepotřebuje dělat vlny — ty se dějí samy.",
};

// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const ENTITIES_DIR = path.join(process.cwd(), "content/entities");

let added = 0;
let skipped = 0;
let notFound = 0;

for (const [slug, tag] of Object.entries(TAGS)) {
  const profilePath = path.join(ENTITIES_DIR, `artist_${slug}`, "profile.json");

  if (!fs.existsSync(profilePath)) {
    console.log(`⚠️  NOT FOUND: artist_${slug}/profile.json`);
    notFound++;
    continue;
  }

  const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));

  if (profile.shortTag && !force) {
    console.log(`⏭️  SKIP: ${slug} (už má shortTag)`);
    skipped++;
    continue;
  }

  profile.shortTag = tag;

  if (dryRun) {
    console.log(`🔍 WOULD SET: ${slug} → "${tag.slice(0, 60)}..."`);
  } else {
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2) + "\n", "utf-8");
    console.log(`✅ SET: ${slug} → "${tag.slice(0, 60)}..."`);
    added++;
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`Added:    ${added}`);
console.log(`Skipped:  ${skipped}`);
console.log(`NotFound: ${notFound}`);
if (dryRun) console.log(`(DRY RUN — no files were modified)`);
