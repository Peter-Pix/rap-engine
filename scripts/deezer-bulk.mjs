#!/usr/bin/env node
/**
 * deezer-bulk.mjs — Dávkové stahování chybějících diskografií
 *
 * Použití: node scripts/deezer-bulk.mjs
 *
 * Postupně stahuje alba + skladby pro umělce, kteří v databázi chybí.
 * Rate limit: 350ms mezi voláními Deezer API.
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");

// Artisti, kteří potřebují doplnit data
const ARTISTS = [
  // 🔴 0 alb v databázi — nejkritičtější
  { id: "430501", name: "Rytmus", slug: "rytmus" },
  { id: "293277", name: "Kato", slug: "kato" },
  { id: "4560558", name: "DJ Wich", slug: "dj-wich" },

  // 🟡 Částečná data
  { id: "77474", name: "Smack", slug: "smack" },
  { id: "5186840", name: "Separ", slug: "separ" },
  { id: "3244721", name: "Hugo Toxxx", slug: "hugo-toxxx" },
  { id: "259106", name: "Rest", slug: "rest" },
  { id: "10104030", name: "Nik Tendo", slug: "nik-tendo" },
  { id: "4779526", name: "Vladimir 518", slug: "vladimir-518" },
  { id: "10525251", name: "Yzomandias", slug: "yzomandias" },
  { id: "153719", name: "Maniak", slug: "maniak" },
  { id: "377020", name: "James Cole", slug: "james-cole" },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const script = path.join(__dirname, "deezer.mjs");

  for (const artist of ARTISTS) {
    // Zjistíme, kolik alb už máme
    const existingAlbums = execSync(
      `grep -l "rapperSlug: \\"${artist.slug}\\"" ${ROOT}/content/alba/*.mdx 2>/dev/null || true`,
      { encoding: "utf8", shell: true }
    ).trim().split("\n").filter(Boolean).length;

    // Zjistíme, kolik alb má Deezer
    const dzCount = parseInt(
      execSync(
        `curl -s "https://api.deezer.com/artist/${artist.id}/albums?limit=1" | python3 -c "import json,sys; print(json.load(sys.stdin).get('total',0))"`,
        { encoding: "utf8", shell: true }
      ).trim()
    );

    const missing = dzCount - existingAlbums;
    console.log(`\n═══════════════════════════════════════`);
    console.log(`${artist.name} (${artist.id}): ${existingAlbums}/${dzCount} alb (chybí ${Math.max(0, missing)})`);
    console.log(`═══════════════════════════════════════`);

    if (missing <= 0) {
      console.log(`  ✅ Už máme víc nebo stejně alb jako Deezer. Přeskakuji.`);
      await sleep(500);
      continue;
    }

    // Stáhneme jen alba (ne skladby) — skladby řešíme zvlášť
    const limit = Math.min(missing + 10, 50); // +10 buffer pro singly/EP
    console.log(`  → Stahuji max ${limit} alb (--no-tracks)...`);

    try {
      const result = execSync(
        `echo "y" | node ${script} artist ${artist.id} --pull-albums --limit-albums ${limit} --no-tracks --force 2>&1`,
        { encoding: "utf8", shell: true, timeout: 300000 } // 5 min per artist
      );
      console.log(result);
    } catch (e) {
      console.error(`  ✖ Chyba u ${artist.name}: ${e.message}`);
    }

    await sleep(1000); // pauza mezi umělci
  }

  console.log(`\n✅ Hotovo!`);
}

main().catch(console.error);