#!/usr/bin/env node
/**
 * generate-mdx.mjs — vytvoří Contentlayer MDX z data/*.json entit (aby měly stránky).
 *
 * BEZPEČNOST: defaultně píše JEN chybějící MDX → ruční prózu (bio, recenze) NEPŘEPÍŠE.
 *   --force      přepíše i existující  (POZOR: smaže ruční text!)
 *   --kind <k>   jen jeden typ: rapper|album|track|label|genre
 *   --dry-run    nic nezapíše, jen vypíše
 *
 * year se píše jako ČÍSLO. description/publishedAt vždy vyplněné (povinná pole).
 *
 *   node scripts/generate-mdx.mjs --kind rapper --dry-run
 *   node scripts/generate-mdx.mjs --kind rapper
 *   npx contentlayer2 build         # ověř po každém typu
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const D = (p) => path.join(ROOT, p);

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const DRY = argv.includes("--dry-run");
const ONLY = (() => { const i = argv.indexOf("--kind"); return i >= 0 ? argv[i + 1] : null; })();
const TODAY = new Date().toISOString().slice(0, 10);

// indexy slug → zobrazované jméno
const NAME = {
  rapper: nameIndex("data/rappers"),
  album: nameIndex("data/albums"),
  label: nameIndex("data/labels"),
};

const KINDS = {
  rapper: { srcDir: "data/rappers", outDir: "content/raperi", fm: rapperFm },
  album: { srcDir: "data/albums", outDir: "content/alba", fm: albumFm },
  track: { srcDir: "data/tracks", outDir: "content/skladby", fm: trackFm },
  label: { srcDir: "data/labels", outDir: "content/labely", fm: labelFm },
  genre: { srcDir: "data/genres", outDir: "content/zanry", fm: genreFm },
};

let created = 0, skipped = 0, total = 0;
for (const [kind, cfg] of Object.entries(KINDS)) {
  if (ONLY && ONLY !== kind) continue;
  runKind(kind, cfg);
}
console.log(`\n${DRY ? "[dry-run] " : ""}Vytvořeno: ${created}, přeskočeno (existuje): ${skipped}, celkem entit: ${total}`);

function runKind(kind, cfg) {
  const src = D(cfg.srcDir), out = D(cfg.outDir);
  const files = listJson(src);
  console.log(`\n── ${kind} (${files.length}) → ${cfg.outDir}`);
  for (const f of files) {
    total++;
    let j; try { j = JSON.parse(fs.readFileSync(path.join(src, f), "utf8")); } catch { console.log(`  ✖ vadný JSON: ${f}`); continue; }
    const slug = j.slug || f.replace(/\.json$/, "");
    const mdxPath = path.join(out, `${slug}.mdx`);
    if (fs.existsSync(mdxPath) && !FORCE) { skipped++; continue; }

    const fm = cfg.fm(j, slug);
    if (!fm) { console.log(`  ⚠ ${slug}: nelze sestavit frontmatter — přeskočeno`); continue; }
    const body = `## ${fm._h || "Info"}\n\n_Stub — doplnit._\n`;
    const mdx = `---\n${emitYaml(fm)}\n---\n\n${body}`;

    created++;
    if (DRY) { if (created <= 3) console.log(`  ~ ${slug}.mdx\n${mdx}`); else console.log(`  ~ ${slug}.mdx`); }
    else { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(mdxPath, mdx, "utf8"); }
  }
}

// ── frontmatter mappery (klíč _h = nadpis těla, nejde do YAML) ──
function rapperFm(j, slug) {
  const genres = (j.meta?.genres || []).map((g) => g.slug || g);
  const labelSlug = j.meta?.primaryLabel?.slug || null;
  return {
    _h: "Bio",
    title: j.title || j.name || slug,
    slug,
    realName: clean(j.meta?.realName),
    born: clean(j.meta?.born),
    active: j.meta?.active?.from ? `${j.meta.active.from} - dosud` : undefined,
    label: labelSlug ? (NAME.label[labelSlug] || labelSlug) : undefined,
    genre: genres,
    description: desc(j, `${j.title || slug} — interpret české/slovenské rapové scény.`),
    publishedAt: j.createdAt || TODAY,
  };
}
function albumFm(j, slug) {
  const artistSlug = j.meta?.artist?.slug || null;
  const labelSlug = j.meta?.label?.slug || null;
  const genres = (j.meta?.genres || []).map((g) => g.slug || g);
  const tracklist = j.meta?.trackTitles || j.meta?.tracklist || [];
  return {
    _h: "O albu",
    title: j.title || slug,
    slug,
    rapper: artistSlug ? (NAME.rapper[artistSlug] || artistSlug) : undefined,
    rapperSlug: artistSlug || undefined,
    label: labelSlug ? (NAME.label[labelSlug] || labelSlug) : (j.meta?.labelName || undefined),
    labelSlug: labelSlug || undefined,
    year: numOrU(j.meta?.year),
    genre: genres,
    description: desc(j, `${j.title || slug} — album${artistSlug ? ` od ${NAME.rapper[artistSlug] || artistSlug}` : ""}${j.meta?.year ? ` (${j.meta.year})` : ""}.`),
    image: j.meta?.cover || j.image || undefined,
    tracklist: Array.isArray(tracklist) && tracklist.length ? tracklist : undefined,
    publishedAt: j.createdAt || TODAY,
  };
}
function trackFm(j, slug) {
  const pa = j.meta?.primaryArtist?.slug || null;
  const feats = (j.meta?.features || []).map((x) => x.slug || x);
  const prods = (j.meta?.producers || []).map((x) => x.slug || x);
  const genres = (j.meta?.genres || []).map((g) => g.slug || g);
  const albumSlug = j.meta?.album?.slug || null;
  return {
    _h: "Kontext",
    title: j.title || slug,
    slug,
    rapper: pa ? (NAME.rapper[pa] || pa) : (j.meta?.primaryArtist?.slug || slug),
    rapperSlug: pa || slug,
    features: feats,
    featuresNames: feats.map((s) => NAME.rapper[s] || s),
    album: albumSlug ? (NAME.album[albumSlug] || albumSlug) : undefined,
    albumSlug: albumSlug || undefined,
    year: numOrU(j.meta?.year),
    genre: genres,
    duration: clean(j.meta?.duration),
    trackNumber: numOrU(j.meta?.trackNumber),
    producers: prods,
    producersNames: prods.map((s) => NAME.rapper[s] || s),
    description: desc(j, `${j.title || slug} — skladba${pa ? ` od ${NAME.rapper[pa] || pa}` : ""}.`),
    publishedAt: j.createdAt || TODAY,
  };
}
function labelFm(j, slug) {
  return {
    _h: "O labelu",
    title: j.title || j.name || slug,
    slug,
    founded: clean(j.meta?.founded),
    location: clean(j.meta?.city || j.meta?.location),
    description: desc(j, `${j.title || slug} — label české/slovenské rapové scény.`),
    publishedAt: j.createdAt || TODAY,
  };
}
function genreFm(j, slug) {
  return {
    _h: "O žánru",
    title: j.title || j.name || slug,
    slug,
    origin: clean(j.meta?.origin),
    description: desc(j, `${j.title || slug} — hudební žánr.`),
    publishedAt: j.createdAt || TODAY,
  };
}

// ── helpers ──
function desc(j, fallback) {
  const o = clean(j.significance?.oneLiner) || clean(j.summary);
  return o || fallback;
}
function clean(v) { if (v == null) return undefined; const s = String(v).trim(); return (s === "" || s === ">-" || s === ">") ? undefined : s; }
function numOrU(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : undefined; }
function nameIndex(dir) {
  const m = {};
  for (const f of listJson(D(dir))) { try { const j = JSON.parse(fs.readFileSync(path.join(D(dir), f), "utf8")); const s = j.slug || f.replace(/\.json$/, ""); m[s] = j.title || j.name || s; } catch {} }
  return m;
}
function listJson(dir) { try { return fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")); } catch { return []; } }

// YAML emitter: string→quoted, number→bare, array→[..]; vynechá undefined
function emitYaml(obj) {
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === "_h" || v === undefined) continue;
    if (Array.isArray(v)) lines.push(`${k}: [${v.map((x) => JSON.stringify(String(x))).join(", ")}]`);
    else if (typeof v === "number") lines.push(`${k}: ${v}`);
    else lines.push(`${k}: ${JSON.stringify(String(v))}`);
  }
  return lines.join("\n");
}
