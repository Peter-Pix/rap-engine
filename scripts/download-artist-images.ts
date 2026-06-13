#!/usr/bin/env node
/**
 * download-artist-images.ts — Stáhne profilové fotky rapperů z veřejných zdrojů
 *
 * Zdroje (v pořadí):
 * 1. Wikipedia EN (pageimages API)
 * 2. Wikipedia CS (pageimages API)
 * 3. (budoucí: Google Images / Base44)
 *
 * Usage: npx tsx scripts/download-artist-images.ts
 * Běh: stahuje pouze nové fotky (přeskočí existující)
 * Commit: sám git commituje každou dávku
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const REPO = path.resolve(__dirname, "..");
const LOG_FILE = path.join(REPO, "logs", "download-images.log");
const IMAGE_DIR = path.join(REPO, "public", "images", "artists");
const IMAGES_TS_PATH = path.join(REPO, "src", "lib", "content", "images.ts");

// ─── Artists we want images for (hotoví rappeři)
const PRIORITY_ARTISTS: Record<string, string> = {
  // Top priority — nejznámější / nejvíc hotoví
  "rytmus": "Rytmus",
  "separ": "Separ",
  "majk-spirit": "Majk Spirit",
  "kali": "Kali",
  "paulie-garand": "Paulie Garand",
  "ego": "Ego",
  "orion": "Orion",
  "marpo": "Marpo",
  "ben-cristovao": "Ben Cristovao",
  "gleb": "Gleb",
  "ptk": "PTK",
  "pil-c": "Pil C",
  "fobia-kid": "Fobia Kid",
  "vercetti-cg": "Vercetti CG",
  "fvck-kvlt": "Fvck_Kvlt",
  "mike-trafik": "Mike Trafik",
  "arleta": "Arleta",
  "hellwana": "Hellwana",
  "adiss": "ADiss",
  "calin": "Calin",
  "robin-tent": "Robin Tent",
  "saul": "Saul",
  "marko-damian": "Marko Damian",
  "maniak": "Maniak",
  "nik-tendo": "Nik Tendo",
  "hugo-toxxx": "Hugo Toxxx",
  "viktor-sheen": "Viktor Sheen",
  "yzomandias": "Yzomandias",
  "redzed": "Redzed",
  "smack": "Smack",
  "ektor": "Ektor",
  "james-cole": "James Cole",
  "michajlov": "Michajlov",
  "sergei-barracuda": "Sergei Barracuda",
  "dollar-prync": "Dollar Prync",
  "reznik": "Řezník",
  "la4": "LA4",
  "vladimir-518": "Vladimir 518",
  "dorian": "Dorian",
  "kojo": "KOJO",
  "koukr": "Koukr",
  "kato": "Kato",
  "lboy-bsc": "Lboy BSC",
  "grey256": "Grey256",
  "dj-fatte": "Dj Fatte",
  "idea": "Idea",
  "rest": "Rest",
  "blako": "Blako",
  "hard-rico": "Hard Rico",
  "hasan": "Hasan",
  "koky": "Koky",
  "renne-dang": "Renne Dang",
  "robin-zoot": "Robin Zoot",
  "sensey": "Sensey",
  "sofian-medjmedj": "Sofian Medjmedj",
  "stein27": "Stein27",
  // Další významní
  "kali": "Kali",
  "majk-spirit": "Majk Spirit",
  "rytmus": "Rytmus",
  "paulie-garand": "Paulie Garand",
  "rest": "Rest",
  "samey": "Samey",
  "lipo": "Lipo",
};

// Wikipedia search names — mapping slug → Wikipedia page title
const WIKI_SEARCH: Record<string, string[]> = {
  "rytmus": ["Rytmus", "Patrik Vrbovský"],
  "separ": ["Separ"],
  "ego": ["Ego rapper", "Michal Straka rapper"],
  "orion": ["Orion rapper", "Oto Klempíř"],
  "marpo": ["Marpo", "Otakar Petřina"],
  "ben-cristovao": ["Ben Cristovao"],
  "gleb": ["Gleb rapper"],
  "ptk": ["PTK rapper", "Vojtěch Tkáč"],
  "pil-c": ["Pil C"],
  "fvck-kvlt": ["Fvck_Kvlt", "Denis Bango"],
  "mike-trafik": ["Mike Trafik"],
  "arleta": ["Arleta rapper"],
  "hellwana": ["Hellwana"],
  "calin": ["Calin rapper"],
  "adiss": ["ADiss"],
  "saul": ["Saul rapper"],
  "marko-damian": ["Marko Damian"],
  "maniak": ["Maniak rapper"],
  "nik-tendo": ["Nik Tendo"],
  "hugo-toxxx": ["Hugo Toxxx"],
  "viktor-sheen": ["Viktor Sheen"],
  "yzomandias": ["Yzomandias"],
  "redzed": ["Redzed"],
  "smack": ["Smack rapper"],
  "ektor": ["Ektor"],
  "james-cole": ["James Cole rapper"],
  "michajlov": ["Michajlov"],
  "sergei-barracuda": ["Sergei Barracuda"],
  "dollar-prync": ["Dollar Prync"],
  "reznik": ["Řezník"],
  "la4": ["LA4 rapper"],
  "vladimir-518": ["Vladimir 518", "Vladimír Brož rapper"],
  "dorian": ["Dorian rapper"],
  "kojo": ["KOJO rapper"],
  "kali": ["Kali rapper", "Kali slovenský rapper"],
  "majk-spirit": ["Majk Spirit", "Michal Dušička"],
  "paulie-garand": ["Paulie Garand", "Pavel Zbořil"],
  "samey": ["Samey rapper"],
  "lipo": ["Lipo rapper"],
};

// ─── Logger ───────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function git(...args: string[]): string {
  try {
    return execSync(`git ${args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}`, {
      cwd: REPO, encoding: "utf-8",
    }).trim();
  } catch { return ""; }
}

function gitCommit(msg: string) {
  const status = git("status", "--porcelain");
  if (!status) return false;
  const files = status.split("\n").map(l => l.slice(3)).filter(Boolean);
  git("add", ...files);
  git("commit", "-m", msg);
  log(`  → committed: ${msg}`);
  return true;
}

// ─── Wikipedia API ────────────────────────────────────────────────────────

interface WikiResult {
  source: string;
  width: number;
  height: number;
}

async function searchWiki(wiki: "en" | "cs", title: string): Promise<WikiResult | null> {
  const url = `https://${wiki}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "4rap-cz/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const pages = data?.query?.pages || {};
    for (const pid of Object.keys(pages)) {
      const page = pages[pid];
      if (page?.thumbnail?.source) {
        return {
          source: page.thumbnail.source,
          width: page.thumbnail.width || 0,
          height: page.thumbnail.height || 0,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Download helper ──────────────────────────────────────────────────────

async function downloadImage(url: string, dest: string): Promise<boolean> {
  if (fs.existsSync(dest)) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) return false;
    fs.writeFileSync(dest, buffer);
    return true;
  } catch {
    return false;
  }
}

// ─── Update images.ts ─────────────────────────────────────────────────────

function updateImagesTs(newEntries: Record<string, string>) {
  const lines = fs.readFileSync(IMAGES_TS_PATH, "utf-8").split("\n");

  // Find the ARTIST_IMAGES block and add entries
  const insertIdx = lines.findIndex(l => l.includes("// Base44 synced photos"));
  if (insertIdx === -1) {
    log("  → ERROR: Could not find ARTIST_IMAGES block in images.ts");
    return;
  }

  // Find where the closing } is
  const closeIdx = lines.findIndex((l, i) => i > insertIdx && l.trim() === "};");
  if (closeIdx === -1) return;

  for (const [slug, imgPath] of Object.entries(newEntries)) {
    const entry = `  '${slug}': '${imgPath}',`;
    // Check if slug already exists
    const exists = lines.some(l => l.includes(`'${slug}'`));
    if (!exists) {
      lines.splice(closeIdx, 0, entry);
      // closeIdx intentionally not incremented — we insert before the closing brace
    }
  }

  fs.writeFileSync(IMAGES_TS_PATH, lines.join("\n"));
  log(`  → updated images.ts with ${Object.keys(newEntries).length} new entries`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════ DOWNLOAD ARTIST IMAGES ═══════════");
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const existing = new Set(
    fs.existsSync(IMAGE_DIR)
      ? fs.readdirSync(IMAGE_DIR).map(f => path.parse(f).name)
      : []
  );
  log(`Already have: ${existing.size} images`);

  const newEntries: Record<string, string> = {};
  let downloaded = 0;
  let skipped = 0;

  for (const [slug, name] of Object.entries(PRIORITY_ARTISTS)) {
    const destWebp = path.join(IMAGE_DIR, `${slug}.webp`);
    const destJpg = path.join(IMAGE_DIR, `${slug}.jpg`);

    if (fs.existsSync(destWebp) || fs.existsSync(destJpg)) {
      skipped++;
      continue;
    }

    // Search Wikipedia EN + CS
    const searchTerms = WIKI_SEARCH[slug] || [name];
    let found: WikiResult | null = null;

    for (const term of searchTerms) {
      found = await searchWiki("en", term);
      if (found) {
        log(`${name}: found on EN Wikipedia as "${term}"`);
        break;
      }
      found = await searchWiki("cs", term);
      if (found) {
        log(`${name}: found on CS Wikipedia as "${term}"`);
        break;
      }
    }

    if (found) {
      // Convert to webp (or keep original extension)
      const ext = path.extname(new URL(found.source).pathname) || ".jpg";
      const dest = path.join(IMAGE_DIR, `${slug}${ext}`);

      const ok = await downloadImage(found.source, dest);
      if (ok) {
        const size = fs.statSync(dest).size;
        log(`  → downloaded: ${slug}${ext} (${(size / 1024).toFixed(0)}KB)`);
        newEntries[slug] = `/images/artists/${slug}${ext}`;
        downloaded++;
      } else {
        log(`  ✗ download failed for ${name}`);
      }
    } else {
      log(`${name}: no image found on Wikipedia`);
    }

    // Rate limit — be nice to Wikipedia
    await new Promise(r => setTimeout(r, 500));
  }

  // ── Update images.ts ───────────────────────────────────────────
  if (Object.keys(newEntries).length > 0) {
    updateImagesTs(newEntries);
  }

  // ── Git commit ────────────────────────────────────────────────
  if (downloaded > 0) {
    gitCommit(`feat: artist images — ${downloaded} new photos from Wikipedia`);
  }

  log(`\n✅ Done: ${downloaded} downloaded, ${skipped} already existed`);
  log(`📸 Now have: ${existing.size + downloaded} artist images`);
  log("═══════════ END ═══════════\n");
}

main().catch((e) => {
  log(`\n❌ FATAL: ${e.message || e}`);
  process.exit(1);
});