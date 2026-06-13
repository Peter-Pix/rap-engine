#!/usr/bin/env -S npx tsx
/**
 * Audit script: porovnává taxonomy profily v raw-data/taxonomy/15profilu/ a
 * raw-data/taxonomy/9rappers/ a raw-data/taxonomy/10/ s obsahem v databázi
 * (content/entities/artist_*).
 *
 * Kontroluje:
 *  1. Existenci entity pro daného rappera
 *  2. Pokrytí textu (% bytů z raw profilu, které jsou v entity.mdx)
 *  3. Klíčová fakta (realName, birthDate, origin) z overena_data.txt
 *  4. Relations pokrytí (genres, styles, moods, scenes, themes) z 6 .txt taxonomies
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const RAW_TAX = join(ROOT, "raw-data", "taxonomy");
const ENTITIES = join(ROOT, "content", "entities");

// ─── helpers ──────────────────────────────────────────────────────────────
function readEntity(slug: string) {
  const id = `artist_${slug}`;
  const dir = join(ENTITIES, id);
  if (!existsSync(dir)) return null;
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf-8"));
  const mdx = readFileSync(join(dir, "entity.mdx"), "utf-8");
  const rel = JSON.parse(readFileSync(join(dir, "relations.json"), "utf-8"));
  // strip frontmatter
  const body = mdx.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
  return { id, dir, meta, mdx, body, rel };
}

function profilePathFor(slug: string): string | null {
  const candidates = [
    `15profilu/${slugToFileName(slug)}.txt`,
    `9rappers/${slugToFileName(slug)}.txt`,
    `10/${slugToFileName(slug)}.txt`,
  ];
  for (const c of candidates) {
    const p = join(RAW_TAX, c);
    if (existsSync(p)) return p;
  }
  return null;
}

function slugToFileName(slug: string): string {
  // "ben-cristovao" → "Ben Cristovao", "dorian" → "Dorian"
  return slug.split("-").map(s => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function coverage(rawText: string, entityBody: string): number {
  if (rawText.length === 0) return 1;
  // Heuristic: count how many 100-char chunks from raw appear (case-insensitive)
  // in the entity body. Cheap & robust.
  const step = 100;
  const raw = rawText.toLowerCase();
  const body = entityBody.toLowerCase();
  let hits = 0;
  let total = 0;
  for (let i = 0; i + step <= raw.length; i += step) {
    const chunk = raw.slice(i, i + step).trim();
    if (chunk.length < 30) continue;
    total++;
    if (body.includes(chunk)) hits++;
  }
  return total === 0 ? 1 : hits / total;
}

// ─── 1. PROFILES: 15profilu/ + 9rappers/ + 10/ ────────────────────────────
const profileDirs = ["15profilu", "9rappers", "10"];
const profileResults: Array<{
  slug: string;
  rawBytes: number;
  entityBytes: number;
  coverage: number;
  hasRealName: boolean;
  realName: string | null;
}> = [];

for (const dir of profileDirs) {
  const dirPath = join(RAW_TAX, dir);
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith(".txt")) continue;
    const slug = file.replace(/\.txt$/, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const rawText = readFileSync(join(dirPath, file), "utf-8");
    const entity = readEntity(slug);

    let coverage_pct = 0;
    let entityBytes = 0;
    let hasRealName = false;
    let realName: string | null = null;

    if (entity) {
      coverage_pct = coverage(rawText, entity.body);
      entityBytes = entity.body.length;
      hasRealName = !!entity.meta.realName;
      realName = entity.meta.realName ?? null;
    }

    profileResults.push({
      slug,
      rawBytes: rawText.length,
      entityBytes,
      coverage: coverage_pct,
      hasRealName,
      realName,
    });
  }
}

// ─── 2. TAXONOMY JSON FILES (6 .txt) ────────────────────────────────────
const taxonomyFiles = [
  "ALTERNATIVE - EXPERIMENTAL.txt",
  "BOOM BAP - CONSCIOUS.txt",
  "DALŠÍ CZ RAPPEŘI.txt",
  "MAINSTREAM - TRAP CORE.txt",
  "SK SCÉNA.txt",
  "STREET - HARD - DRILL CORE.txt",
];

interface TaxonomyEntry {
  rapper: string;
  genre: string[];
  style: string[];
  scene: string[];
  vibe: string[];
  themes: string[];
}

const allTaxonomyEntries: TaxonomyEntry[] = [];
for (const tf of taxonomyFiles) {
  const p = join(RAW_TAX, tf);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf-8");
  // Find the top-level array by bracket-matching (regex is fragile because
  // inner arrays like genre:["trap"] confuse greedy matching).
  const startIdx = text.indexOf("[");
  if (startIdx < 0) continue;
  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }
  if (endIdx < 0) continue;
  const arrayLiteral = text.slice(startIdx, endIdx + 1);
  try {
    // Format is JS object literals, not strict JSON. Keys are unquoted,
    // single-quoted strings may appear, trailing commas possible.
    // eslint-disable-next-line no-eval
    const parsed = eval('(' + arrayLiteral + ')') as TaxonomyEntry[];
    for (const e of parsed) allTaxonomyEntries.push(e);
  } catch (err) {
    console.error(`Failed to parse ${tf}: ${(err as Error).message}`);
  }
}

// Build per-rapper taxonomy expectations
const expectedByArtist = new Map<string, {
  genres: Set<string>;
  styles: Set<string>;
  scenes: Set<string>;
  vibes: Set<string>;
  themes: Set<string>;
  sources: string[];
}>();

for (const e of allTaxonomyEntries) {
  let slot = expectedByArtist.get(e.rapper);
  if (!slot) {
    slot = { genres: new Set(), styles: new Set(), scenes: new Set(), vibes: new Set(), themes: new Set(), sources: [] };
    expectedByArtist.set(e.rapper, slot);
  }
  e.genre?.forEach(g => slot!.genres.add(g));
  e.style?.forEach(s => slot!.styles.add(s));
  e.scene?.forEach(s => slot!.scenes.add(s));
  e.vibe?.forEach(v => slot!.vibes.add(v));
  e.themes?.forEach(t => slot!.themes.add(t));
  slot.sources.push(...Object.keys(e).filter(k => Array.isArray((e as any)[k]) && (e as any)[k].length > 0));
}

// ─── 3. Check each rapper's coverage ─────────────────────────────────────
const taxonomyResults: Array<{
  slug: string;
  exists: boolean;
  genresHit: number; genresTotal: number;
  stylesHit: number; stylesTotal: number;
  scenesHit: number; scenesTotal: number;
  moodsHit: number; moodsTotal: number;
  themesHit: number; themesTotal: number;
  missing: string[];
}> = [];

for (const [rapper, expected] of expectedByArtist.entries()) {
  const entity = readEntity(rapper);
  if (!entity) {
    taxonomyResults.push({
      slug: rapper, exists: false,
      genresHit: 0, genresTotal: expected.genres.size,
      stylesHit: 0, stylesTotal: expected.styles.size,
      scenesHit: 0, scenesTotal: expected.scenes.size,
      moodsHit: 0, moodsTotal: expected.vibes.size,
      themesHit: 0, themesTotal: expected.themes.size,
      missing: [
        ...[...expected.genres].map(g => `genre:${g}`),
        ...[...expected.styles].map(s => `style:${s}`),
        ...[...expected.scenes].map(s => `scene:${s}`),
        ...[...expected.vibes].map(v => `mood:${v}`),
        ...[...expected.themes].map(t => `theme:${t}`),
      ],
    });
    continue;
  }

  // Map relations
  const genres = new Set((entity.rel.genres ?? []) as string[]);
  const styles = new Set((entity.rel.styles ?? []) as string[]);
  const scenes = new Set((entity.rel.scenes ?? []) as string[]);
  const moods = new Set((entity.rel.moods ?? []) as string[]);
  const themes = new Set((entity.rel.themes ?? []) as string[]);

  const missing: string[] = [];
  let gh = 0; for (const g of expected.genres) { if (genres.has(`genre_${g}`) || genres.has(g)) gh++; else missing.push(`genre:${g}`); }
  let sh = 0; for (const s of expected.styles) { if (styles.has(`style_${s}`) || styles.has(s)) sh++; else missing.push(`style:${s}`); }
  let sch = 0; for (const s of expected.scenes) { if (scenes.has(`scene_${s}`) || scenes.has(s)) sch++; else missing.push(`scene:${s}`); }
  let mh = 0; for (const v of expected.vibes) { if (moods.has(`mood_${v}`) || moods.has(v)) mh++; else missing.push(`mood:${v}`); }
  let th = 0; for (const t of expected.themes) { if (themes.has(`theme_${t}`) || themes.has(t)) th++; else missing.push(`theme:${t}`); }

  taxonomyResults.push({
    slug: rapper, exists: true,
    genresHit: gh, genresTotal: expected.genres.size,
    stylesHit: sh, stylesTotal: expected.styles.size,
    scenesHit: sch, scenesTotal: expected.scenes.size,
    moodsHit: mh, moodsTotal: expected.vibes.size,
    themesHit: th, themesTotal: expected.themes.size,
    missing,
  });
}

// ─── 4. OVERENA DATA: realName / birthDate / origin ─────────────────────
const overenaPath = join(RAW_TAX, "cesti_slovensti_rapperi_overena_data.txt");
const overenaResults: Array<{
  name: string;
  slug: string | null;
  expected: { realName?: string; birthDate?: string; origin?: string };
  actual: { realName?: string; birthDate?: string; origin?: string };
  hasEntity: boolean;
}> = [];

if (existsSync(overenaPath)) {
  const text = readFileSync(overenaPath, "utf-8");
  // Format: "Jméno (alias)  | Pravé jméno | Město (pozn.) | datum"
  // One entry per line. Skip headers, separators, and continuation lines (indented).
  const lines = text.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("=") || line.startsWith("-") || line.startsWith("|") || line.startsWith("·")) continue;
    if (line.startsWith("ČEŠTÍ") || line.startsWith("SLOVENŠTÍ") || line.startsWith("SKUPINY") || line.startsWith("NEOVĚŘENO") || line.startsWith("JAK SEZNAM") || line.startsWith("METODIKA") || line.startsWith("Umělecké")) continue;
    if (line.startsWith("*") || line.startsWith("**") || line.startsWith("—") || line.startsWith("Tipy") || line.startsWith("Realisticky") || line.startsWith("Pokud") || line.startsWith("Poslední")) continue;
    if (line.startsWith("- ") || line.startsWith("(")) continue;
    // Must contain 3 pipes at minimum
    const parts = line.split("|").map(s => s.trim());
    if (parts.length < 3) continue;
    const nameField = parts[0];
    const realNameField = parts[1];
    const originField = parts[2];
    const dateField = parts[3] ?? "";

    // Skip non-entries (Poznámky, etc.)
    if (nameField.startsWith("Pozn") || nameField.startsWith("Data") || nameField.startsWith("Členové") || nameField.startsWith("příliš")) continue;

    // Extract alias from "Smack One (Smack)" → primary "Smack One", alias "Smack"
    const aliasMatch = nameField.match(/^([^(]+?)\s*\(([^)]+)\)/);
    let name: string;
    let alias: string | null = null;
    if (aliasMatch) {
      name = aliasMatch[1].trim();
      alias = aliasMatch[2].trim();
    } else {
      name = nameField;
    }

    // Convert "NEUVEDENO" → null
    const realName = realNameField.includes("NEUVEDENO") ? null : realNameField.replace(/\s+\*+$/, "").trim();
    const origin = originField.replace(/\s+\*+$/, "").trim();
    // Date: "7. 6. 1986" or "1986" or "NEUVEDENO"
    let birthDate: string | null = null;
    if (dateField && !dateField.includes("NEUVEDENO")) {
      const dateClean = dateField.trim();
      const dmyMatch = dateClean.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
      if (dmyMatch) {
        const d = dmyMatch[1].padStart(2, "0");
        const m = dmyMatch[2].padStart(2, "0");
        const y = dmyMatch[3];
        birthDate = `${y}-${m}-${d}`;
      } else {
        const yMatch = dateClean.match(/^(\d{4})$/);
        if (yMatch) birthDate = yMatch[1];
      }
    }

    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const entity = readEntity(slug);
    overenaResults.push({
      name,
      slug,
      expected: { realName: realName ?? undefined, birthDate: birthDate ?? undefined, origin: origin || undefined },
      actual: entity ? {
        realName: entity.meta.realName,
        birthDate: entity.meta.birthDate,
        origin: entity.meta.origin,
      } : {},
      hasEntity: !!entity,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(80));
console.log("1. PROFILE COVERAGE (15profilu/ + 9rappers/ + 10/ vs entity.mdx)");
console.log("═".repeat(80));
console.log("slug                              | raw  B  | ent  B  | coverage | realName");
console.log("─".repeat(80));
const sortedProfiles = profileResults.sort((a, b) => a.coverage - b.coverage);
for (const r of sortedProfiles) {
  const slug = r.slug.padEnd(34);
  const raw = String(r.rawBytes).padStart(7);
  const ent = String(r.entityBytes).padStart(7);
  const cov = r.entityBytes === 0 ? "  MISSING" : `${(r.coverage * 100).toFixed(0).padStart(3)}%`;
  const rn = r.hasRealName ? `✓ ${(r.realName ?? "").slice(0, 20)}` : (r.entityBytes > 0 ? "✗ missing" : "—");
  console.log(`${slug} | ${raw} | ${ent} | ${cov.padStart(7)} | ${rn}`);
}

console.log("\n" + "═".repeat(80));
console.log("2. TAXONOMY RELATION COVERAGE (6 .txt files → entity relations.json)");
console.log("═".repeat(80));
const sortedTax = taxonomyResults.sort((a, b) => {
  const aTotal = a.genresTotal + a.stylesTotal + a.scenesTotal + a.moodsTotal + a.themesTotal;
  const bTotal = b.genresTotal + b.stylesTotal + b.scenesTotal + b.moodsTotal + b.themesTotal;
  return aTotal - bTotal;
});
console.log("slug                    | exists | genre     style      scene      mood       theme      | missing");
console.log("─".repeat(110));
for (const r of sortedTax) {
  const slug = r.slug.padEnd(22);
  const ex = r.exists ? "✓" : "✗ MISSING";
  const fmt = (h: number, t: number) => `${h}/${t}`.padStart(8);
  const g = fmt(r.genresHit, r.genresTotal);
  const s = fmt(r.stylesHit, r.stylesTotal);
  const sc = fmt(r.scenesHit, r.scenesTotal);
  const m = fmt(r.moodsHit, r.moodsTotal);
  const th = fmt(r.themesHit, r.themesTotal);
  const miss = r.missing.length > 0 ? r.missing.slice(0, 4).join(", ") + (r.missing.length > 4 ? ` +${r.missing.length - 4}` : "") : "—";
  console.log(`${slug} | ${ex.padEnd(6)} | ${g}  ${s}  ${sc}  ${m}  ${th} | ${miss}`);
}

console.log("\n" + "═".repeat(80));
console.log("3. VERIFIED BIO DATA (cesti_slovensti_rapperi_overena_data.txt)");
console.log("═".repeat(80));
console.log("name                | realName (expect)        = realName (actual)        | birth  expect=actual     | origin expect=actual");
console.log("─".repeat(130));
for (const r of overenaResults) {
  const name = r.name.padEnd(20);
  const exR = (r.expected.realName ?? "—").padEnd(26);
  const acR = (r.actual.realName ?? (r.hasEntity ? "✗ missing" : "— entity missing")).padEnd(26);
  const bEx = (r.expected.birthDate ?? "—").padEnd(20);
  const bAc = (r.actual.birthDate ?? (r.hasEntity ? "✗" : "—")).padEnd(20);
  const oEx = (r.expected.origin ?? "—").padEnd(20);
  const oAc = (r.actual.origin ?? (r.hasEntity ? "✗" : "—")).padEnd(20);
  const match = (r.expected.realName === r.actual.realName ? "✓" : "✗");
  const bMatch = (r.expected.birthDate === r.actual.birthDate ? "✓" : "✗");
  const oMatch = (r.expected.origin === r.actual.origin ? "✓" : "✗");
  console.log(`${name} | ${exR} ${match} ${acR} | ${bEx} ${bMatch} ${bAc} | ${oEx} ${oMatch} ${oAc}`);
}
