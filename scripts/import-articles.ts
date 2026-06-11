#!/usr/bin/env npx tsx
/**
 * Import articles from reference project (content/clanky/*.mdx)
 */

import fs from "node:fs";
import path from "node:path";

const REF_DIR = "/Users/petrpiskacek/.openclaw/workspace/Project_1/rap-engine-second-trial/content/clanky";
const ENTITIES_DIR = path.join(process.cwd(), "content", "entities");

const CZECH_MAP: Record<string, string> = {
  "á":"a","č":"c","ď":"d","é":"e","ě":"e","í":"i","ň":"n","ó":"o","ř":"r","š":"s","ť":"t","ú":"u","ů":"u","ý":"y","ž":"z",
  "Á":"A","Č":"C","Ď":"D","É":"E","Ě":"E","Í":"I","Ň":"N","Ó":"O","Ř":"R","Š":"S","Ť":"T","Ú":"U","Ů":"U","Ý":"Y","Ž":"Z",
};

function transliterate(str: string): string {
  return str.split("").map(c => CZECH_MAP[c] || c).join("");
}

function parseFrontmatter(body: string): { fm: Record<string, unknown>; rest: string } {
  const lines = body.split("\n");
  if (lines[0].trim() !== "---") return { fm: {}, rest: body };
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (endIdx < 1) return { fm: {}, rest: body };

  const fm: Record<string, unknown> = {};
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx < 1) continue;
    const key = line.substring(0, colonIdx).trim();
    const val = line.substring(colonIdx + 1).trim().replace(/^"/, "").replace(/"$/, "");
    fm[key] = val;
  }

  const rest = lines.slice(endIdx + 1).join("\n").trim();
  return { fm, rest };
}

let created = 0;
let skipped = 0;

if (!fs.existsSync(REF_DIR)) {
  console.error("❌ Reference clanky/ not found:", REF_DIR);
  process.exit(1);
}

const files = fs.readdirSync(REF_DIR).filter((f) => f.endsWith(".mdx"));
console.log(`📂 ${files.length} article files found\n`);

for (const file of files) {
  const raw = fs.readFileSync(path.join(REF_DIR, file), "utf-8");
  const { fm, rest } = parseFrontmatter(raw);

  const rawSlug = (fm.slug as string) || file.replace(".mdx", "");
  const slug = transliterate(rawSlug).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, "");
  const id = `article_${slug}`;
  const dir = path.join(ENTITIES_DIR, id);

  if (fs.existsSync(dir)) {
    console.log(`  ⏭️ ${id}: already exists`);
    skipped++;
    continue;
  }

  fs.mkdirSync(dir, { recursive: true });

  const meta = {
    id,
    type: "article",
    title: (fm.title as string) || slug,
    description: (fm.description as string) || "",
    slug,
    publishedAt: (fm.publishedAt as string) || new Date().toISOString().split("T")[0],
    updatedAt: fm.updatedAt || undefined,
    image: fm.image || undefined,
  };

  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify({}, null, 2));
  fs.writeFileSync(path.join(dir, "entity.mdx"), rest || `# ${meta.title}\n\nČlánek připravujeme.`);

  console.log(`  ✅ ${id}`);
  created++;
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📊 ${created} created, ${skipped} skipped`);
console.log("Run 'npm run cache:build' to rebuild.");
