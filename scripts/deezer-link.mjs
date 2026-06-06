#!/usr/bin/env node
/**
 * deezer-link.mjs — Propojení rapperů z DB s Deezer ID
 *
 * Projde všechny rappery bez Deezer ID, vyhledá je na Deezeru,
 * zkusí potvrdit shodu (název, genre, alba), a pokud je jistá,
 * uloží ID do mapy.
 *
 * Použití: node scripts/deezer-link.mjs          # batch processing
 *          node scripts/deezer-link.mjs --single  # interaktivní pro jednoho
 *          node scripts/deezer-link.mjs --all     # stáhnout vše najednou
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const D = (p) => path.join(ROOT, p);

const MAP_FILE = D("data/maps/deezer-artists.json");
const MAP = JSON.parse(fs.readFileSync(MAP_FILE, "utf8") || "{}");
MAP.byId = MAP.byId || {};

// Načíst všechny rappery
const RAPPER_SLUGS = new Set(
  fs.readdirSync(D("content/raperi"))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
);

// Slug → title cache
const SLUG_TITLE = {};
for (const f of fs.readdirSync(D("content/raperi")).filter((f) => f.endsWith(".mdx"))) {
  const slug = f.replace(/\.mdx$/, "");
  const content = fs.readFileSync(D(`content/raperi/${f}`), "utf8");
  const title = content.match(/^title:\s*"([^"]+)/m)?.[1] || slug;
  SLUG_TITLE[slug] = title;
}

// Zjistit kdo už má Deezer ID
const mapped = new Set(Object.values(MAP.byId));
const missing = [...RAPPER_SLUGS].filter((s) => !mapped.has(s)).sort();
console.log(`\n📊 Celkem rapperů: ${RAPPER_SLUGS.size}`);
console.log(`✅ S Deezer ID: ${mapped.size}`);
console.log(`🔍 Bez Deezer ID: ${missing.length}`);

const FOUND = {}; // slug → deezerId
const SKIPPED = [];

const argv = process.argv.slice(2);

async function main() {
  const explicit = [];
  const rest = [];

  for (const slug of missing) {
    const name = SLUG_TITLE[slug];
    // Filtrovat jasně ne-CZ/SK — jen mezinárodní jména
    if (isForeign(name, slug)) {
      console.log(`  ⏭  ${slug} — mezinárodní/pravděpodobně ne CZ/SK`);
      SKIPPED.push({ slug, name, reason: "foreign" });
      continue;
    }
    rest.push({ slug, name });
  }

  console.log(`\n🔍 K vyhledání: ${rest.length} rapperů`);
  console.log(`⏭  Přeskočeno: ${SKIPPED.length}\n`);

  // Batch search — Deezer API má rate limit
  for (let i = 0; i < rest.length; i++) {
    const { slug, name } = rest[i];
    await searchAndVerify(slug, name, i, rest.length);
    await sleep(350); // rate limit
  }

  // Save results
  const added = Object.keys(FOUND).length;
  if (added > 0) {
    for (const [slug, id] of Object.entries(FOUND)) {
      MAP.byId[String(id)] = slug;
    }
    fs.writeFileSync(MAP_FILE, JSON.stringify(MAP, null, 2) + "\n", "utf8");
    console.log(`\n✅ Uloženo ${added} nových Deezer ID`);
  } else {
    console.log(`\n⚠️ Žádná nová Deezer ID nenalezena`);
  }
}

async function searchAndVerify(slug, name, idx, total) {
  // Zkusit přímý search
  const results = await searchDeezer(name, "artist");
  if (!results || results.length === 0) {
    // Zkusit alternativní název
    const alt = alternativeName(slug, name);
    if (alt) {
      const results2 = await searchDeezer(alt, "artist");
      if (results2 && results2.length > 0) {
        return verify(slug, name, results2, idx, total);
      }
    }
    console.log(`  [${idx + 1}/${total}] ❌ ${slug} — nenalezen`);
    return;
  }

  await verify(slug, name, results, idx, total);
}

async function verify(slug, name, results, idx, total) {
  // Zkusit najít shodu podle jména (case-insensitive)
  const nameLower = name.toLowerCase().trim();

  for (const artist of results) {
    const artistName = artist.name.toLowerCase().trim();
    const similarity = similarityScore(nameLower, artistName);

    if (similarity > 0.7) {
      // Potvrzení: zkontrolovat genre (rap/hip-hop)
      const genre = await getArtistGenre(artist.id);
      const isHipHop = genre.some((g) =>
        g.toLowerCase().includes("rap") ||
        g.toLowerCase().includes("hip") ||
        g.toLowerCase().includes("trap") ||
        g.toLowerCase().includes("drill") ||
        g.toLowerCase().includes("grime") ||
        g.toLowerCase().includes("rnb") ||
        g.toLowerCase().includes("r&b")
      );

      if (isHipHop || similarity > 0.9) {
        // Konečné potvrzení: zkontrolovat alba — hledat české názvy
        const albums = await getArtistAlbums(artist.id, 5);
        const czSkIndicators = albums.filter((a) => hasCzSkChars(a.title)).length;

        if (czSkIndicators > 0 || similarity > 0.9 || isHipHop) {
          FOUND[slug] = String(artist.id);
          console.log(`  [${idx + 1}/${total}] ✅ ${slug} → id ${artist.id} (${artist.name}, ${artist.nb_fan?.toLocaleString() || "?"} fans, genre: ${genre.join(", ")})`);
          return;
        }
      }
    }
  }

  // Nenašli jsme jasnou shodu — zkusit hledat podle alb
  console.log(`  [${idx + 1}/${total}] ⚠️  ${slug} — možná shoda, ale nejistá (${results.map(r => r.name + "(" + r.id + ")").join(", ")})`);
}

function isForeign(name, slug) {
  const foreign = [
    "snoop-dogg", "french-montana", "dr-alban", "snoop",
    "bj-rnskov", "shontelle",
  ];
  if (foreign.includes(slug)) return true;

  // Podle jména: bez diakritiky, pokud neobsahuje cz/sk znaky
  const czSkNames = [
    "ben cristovao", "michael kocab", "michal", "katarzia",
    "dara rolins", "matej", "aneta", "sima", "momo",
    "lipo", "konex", "rest", "separ", "yzomandias",
    "maniak", "ektor", "nik tendo", "hugo", "rytmus",
    "decky", "kato", "vladimir", "doktor", "orion",
    "james cole", "paulie garand", "calin", "sergei barracuda",
    "bobby blaze", "lvcas dope", "dj fatte", "idea",
    "ca hanova bulhar", "nobodylisten", "kenny rough",
    "regie 257", "hard rico", "yoga spank", "radimo",
    "mike trafik", "viktor sheen", "hasan", "karlo",
  ];
  // Pokud jméno vypadá zahraniční a není v czSkNames
  return false; // necháme všechny projít vyhledáváním
}

function alternativeName(slug, name) {
  const aliases = {
    "7krat3": "sedmkrat3",
    "cis-t": "Císař T",
    "fvck-kvlt": "Fvck Kvlt",
    "g1nter": "Günter",
    "h16": "H16",
    "ian-dawn": "Ian Dawn",
    "ilyaa": "Ilya",
    "konex": "Konex",
    "majk-spirit": "Majk Spirit",
    "michajlov": "Michajlov",
    "porsche-boy": "Porsche Boy",
    "pretorian": "Pretorian",
    "prezident-lourajder": "Lourajder",
    "puskyn-nikodem": "Nikodem",
    "rakaa-iriscience": "Iriscience",
    "sawsane": "Sawsane",
    "shadow-d": "Shadow D",
    "sharkass": "Shark Ass",
    "sharlota": "Šarlota",
    "side-baby": "Side Baby",
    "soundkail": "Soundkail",
    "spack-ds": "Spack Ds",
    "tafrob": "Tafrob",
    "tina": "Tina",
    "tisci": "Tisci",
    "tony-t": "Tony T",
    "wall-e": "Wall-E",
    "x-kmen": "X Kmen",
    "yeezuz2020": "Yeezuz",
    "youv-dee": "Youv Dee",
    "z-money": "Z Money",
  };
  return aliases[slug] || null;
}

function similarityScore(a, b) {
  // Jednoduchá podobnost — poměr shodných znaků
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / maxLen;
}

function hasCzSkChars(s) {
  const czSk = /[ěščřžýáíéůúňďťó]/i;
  return czSk.test(s);
}

async function searchDeezer(query, type) {
  try {
    const r = await fetch(`https://api.deezer.com/search/${type}?q=${encodeURIComponent(query)}&limit=10`);
    const body = await r.json();
    return body.data || [];
  } catch { return []; }
}

async function getArtistGenre(id) {
  try {
    const r = await fetch(`https://api.deezer.com/artist/${id}`);
    const body = await r.json();
    if (body.error) return [];
    const genres = [];
    if (body.genres?.data) {
      genres.push(...body.genres.data.map((g) => g.name));
    }
    // Also check radio type
    if (body.radio) genres.push("radio");
    return genres;
  } catch { return []; }
}

async function getArtistAlbums(id, limit) {
  try {
    const r = await fetch(`https://api.deezer.com/artist/${id}/albums?limit=${limit}`);
    const body = await r.json();
    return (body.data || []).map((a) => ({ title: a.title, type: a.record_type }));
  } catch { return []; }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch(console.error);