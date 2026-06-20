/**
 * Přidá `shortTag` do profile.json pro top 21-50 rapperů.
 *
 * Tagy jsou **kurátorem schválené** (Peter) — varianta A z návrhu v
 * `memory/rapper-tags-proposal.md`. Některá jména dostanou shortTag i když
 * nemají profile.json (koky, grey256) — pro ně se vyrobí skeleton s krátkým
 * profilem, aby se shortTag mohl propsat do cache.
 *
 * Idempotentní — pokud shortTag existuje, nepřepíše (pokud nepředáš --force).
 *
 * Usage:
 *   npx tsx scripts/add-short-tags-21-50.ts           # přidá chybějící
 *   npx tsx scripts/add-short-tags-21-50.ts --force   # přepíše všechny
 *   npx tsx scripts/add-short-tags-21-50.ts --dry-run # ukáže co by udělal
 *
 * Zdroj tagů: `memory/rapper-tags-proposal.md` (sekce "21-50 rapperů", var. A)
 */

import fs from "node:fs";
import path from "node:path";

// ═══════════════════════════════════════════════════════════════════════════
// Top 21-50 rapperů + originální tagy (varianta A, kurátorem schválené)
// ═══════════════════════════════════════════════════════════════════════════

const TAGS: Record<string, string> = {
  // 21
  "mike-trafik": "Pražská scéna bez Mike Trafika by nebyla kompletní.",
  // 22
  "g1nter": "Chomutovský rapper s ostřej hranou.",
  // 23
  "james-cole": "Americká kvalita, pražský kořeny. James Cole je bilingvní.",
  // 24
  "jay-diesel": "Východočeský hlas, kterej dobyl Prahu.",
  // 25
  "jickson": "Liberecká klasika. Jickson drží tradici.",
  // 26
  "nobodylisten": "Pražský producent a rapper. NobodyListen stojí za nejedním hitem.",
  // 27
  "protiva": "Pražská temnota. Protiva neusmívá se, neusmívej se ani ty.",
  // 28
  "koky": "Ostrov nad Ohří je malý, ale Kokyho zvuk je velkej.",
  // 29
  "lipo": "Liberecká klasika, nezaměnitelný styl.",
  // 30
  "sharlota": "Pražská ženská perspektiva. Sharlota přináší novou energii.",
  // 31
  "shimmi": "Bratislavská mlátička. SHIMMI nikdy neuhne.",
  // 32
  "annet-x": "Brněnská multitalentka. Annet X je víc než jen rapperka.",
  // 33
  "dj-aka": "Brněnský DJ a rapper. AKA značka, ne pseudonym.",
  // 34
  "kojo": "Bratislavská nová vlna. Kojo ukotvil generaci.",
  // 35
  "konex": "Pražská jistota, Konex neuhýbá.",
  // 36
  "majk-spirit": "Bratislavská superstar. Majk Spirit je Slovák, co dobyl Česko.",
  // 37
  "mc-gey": "Pardubická legenda. MC Gey drží český rap při životě.",
  // 38
  "pil-c": "Bratislavská legenda, Pil C vždycky držel laťku.",
  // 39
  "robin-tent": "Brněnská poetika, Robin Tent má styl.",
  // 40
  "sofian-medjmedj": "Pražská naděje, Sofian má energii nový generace.",
  // 41
  "tafrob": "Brněnská klasika, Tafrob nikdy neodejde do děchodu.",
  // 42
  "ca-hanova-bulhar": "Pražská temnota s rapovým ostřím.",
  // 43
  "calin": "Brněnská tradice, Calin vždycky patřil k topu.",
  // 44
  "daniel-vardan": "Brněnská legenda. Daniel Vardan vždycky reprezentoval moravskou scénu.",
  // 45
  "desade": "Pražský temnej hlas. DeSade dělá z temnoty poetiku.",
  // 46
  "dj-fatte": "Zlínská legenda, Dj Fatte reprezentuje Moravu.",
  // 47
  "guapanova": "Pražská mladá krev. guapanova přináší novou perspektivu.",
  // 48
  "dame": "Bratislavská legenda. Dame stál u zrodu DMS.",
  // 49
  "grey256": "Brněnská rapová tradice. Grey256 ji drží.",
  // 50
  "hellwana": "Pražská temnota s ženskou silou.",
};

// ═══════════════════════════════════════════════════════════════════════════
// Pro Koky/Grey256 (bez profile.json) — skeleton profilu ze surových dat
// (raw-data/10 Rapperů s rich popisem.txt).
// ═══════════════════════════════════════════════════════════════════════════

const SKELETON_PROFILES: Record<string, object> = {
  koky: {
    shortIntro:
      "Boombapová páteř Milion+. Bývalý učitel na ZŠ v Jáchymově, který uchoval rapovou integritu v době, kdy se kolem něj všechno měnilo v pastvu pro algoritmy.",
    shortTag: TAGS["koky"],
    note: "Martin Koky, * 1986, Ostrov. Label Milion+. Učitel na ZŠ v Jáchymově. Yzomandias mu napsal první text. Klíčová alba Stát Ve Stínu, Dotýkat Se Hvězd (2021) #1 CZ. Klidný pilíř, tichý workhorse.",
    sources: [
      "https://sk.wikipedia.org/wiki/Koky",
      "https://www.milionplus.cz/",
    ],
  },
  "grey256": {
    shortIntro:
      "Největší český crossover rap → kytary, který masově zafungoval. Bratranec Doriana z Brna, kolem LALALA (12M+ streams) postavil most mezi rapem a pop-rockem.",
    shortTag: TAGS["grey256"],
    note: "Martin Albrecht, * 1992, Brno. Bratranec Doriana. Album LALALA (2021) přesáhlo 12M streamů, album Tentokrát (2024) #1 CZ. Spolupráce s John Wolfhooker. Největší český crossover rap → kytary.",
    sources: [
      "https://cs.wikipedia.org/wiki/Grey256",
      "https://music.apple.com/cz/artist/grey256/1180013998",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const ENTITIES_DIR = path.join(process.cwd(), "content/entities");

let added = 0;
let skipped = 0;
let created = 0;
let notFound = 0;

for (const [slug, tag] of Object.entries(TAGS)) {
  const dir = path.join(ENTITIES_DIR, `artist_${slug}`);
  const profilePath = path.join(dir, "profile.json");

  // ── Bez složky → skip (musí se řešit přes content/creator)
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  NOT FOUND: artist_${slug}/ (složka neexistuje)`);
    notFound++;
    continue;
  }

  // ── Bez profile.json → vytvoř skeleton pro Koky/Grey256
  if (!fs.existsSync(profilePath)) {
    const skeleton = SKELETON_PROFILES[slug];
    if (!skeleton) {
      console.log(`⚠️  NO PROFILE: artist_${slug}/profile.json (a není skeleton)`);
      notFound++;
      continue;
    }
    if (dryRun) {
      console.log(`🆕 WOULD CREATE: artist_${slug}/profile.json (skeleton + shortTag)`);
      created++;
      continue;
    }
    fs.writeFileSync(profilePath, JSON.stringify(skeleton, null, 2) + "\n", "utf-8");
    console.log(`🆕 CREATED: artist_${slug}/profile.json (skeleton + shortTag)`);
    created++;
    continue;
  }

  // ── Existující profile.json → přidej shortTag
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
console.log(`Created:  ${created} (skeleton profiles)`);
console.log(`Skipped:  ${skipped}`);
console.log(`NotFound: ${notFound}`);
if (dryRun) console.log(`(DRY RUN — no files were modified)`);
