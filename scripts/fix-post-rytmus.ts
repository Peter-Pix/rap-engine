import fs from "fs";
import path from "path";

const BASE = path.resolve(process.cwd(), "content/entities");

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p: string, data: any) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

// 1. Add publishedAt to entities missing it
const needsDate = [
  "album_jedini-co-hresi",
  "album_bengoro-ii",
  "album_krstny-otec",
  "album_fenomen",
  "location_kromeriz",
  "location_piestany",
  "mood_positive",
  "scene_slovenska-rapova-scena",
];
for (const id of needsDate) {
  const metaPath = path.join(BASE, id, "meta.json");
  if (!fs.existsSync(metaPath)) {
    console.log(`SKIP (not found): ${id}`);
    continue;
  }
  const meta = readJson(metaPath);
  if (!meta.publishedAt) {
    meta.publishedAt = "2024-01-01";
    writeJson(metaPath, meta);
    console.log(`Fixed publishedAt: ${id}`);
  }
}

// 2. Create mood_confident
const mcDir = path.join(BASE, "mood_confident");
if (!fs.existsSync(mcDir)) {
  fs.mkdirSync(mcDir, { recursive: true });
  const meta = {
    id: "mood_confident",
    type: "mood",
    title: "Confident",
    slug: "confident",
    description: "Sebevědomá a dominantní nálada.",
    publishedAt: "2024-01-01",
  };
  writeJson(path.join(mcDir, "meta.json"), meta);
  fs.writeFileSync(
    path.join(mcDir, "entity.mdx"),
    "---\nid: mood_confident\ntype: mood\ntitle: Confident\n---\n\nSebevědomá a dominantní nálada.\n"
  );
  writeJson(path.join(mcDir, "relations.json"), {});
  console.log("Created mood_confident");
} else {
  console.log("Exists mood_confident");
}

console.log("Post-Rytmus fixes done");
