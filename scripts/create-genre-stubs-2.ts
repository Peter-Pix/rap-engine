#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";

const ENTITIES_DIR = path.join(process.cwd(), "content", "entities");

// Second-degree dangling from genre stubs' related fields
const EXTRA_GENRES: Record<string, string> = {
  "diss": "Diss — provokativní rapové skladby zaměřené na osobní útoky na jiné interprety.",
  "crunk": "Crunk — energetický subžánr southern rapu z Atlanty, party atmosféra.",
  "hyphy": "Hyphy — hyperaktivní bay area rap s tanečními prvky.",
  "bass-music": "Bass music — elektronická hudba zaměřená na hluboké basy, vliv na trap.",
  "sample-based": "Sample-based — produkční styl založený na sampling.",
  "golden-era": "Golden era — klasické období hip-hopu (cca 1987–1996).",
  "memphis-rap": "Memphis rap — temný, lo-fi rap z 90. let Memphisu, vliv na phonk.",
  "meditation-rap": "Meditation rap — rap s meditativními, ambientními prvky.",
};

let created = 0;
for (const [slug, desc] of Object.entries(EXTRA_GENRES)) {
  const id = `genre_${slug}`;
  const dir = path.join(ENTITIES_DIR, id);
  if (fs.existsSync(dir)) { continue; }
  fs.mkdirSync(dir, { recursive: true });
  const meta = {
    id,
    type: "genre",
    title: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    description: desc,
    slug,
    publishedAt: new Date().toISOString().split("T")[0],
    isStub: true,
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify({}, null, 2));
  fs.writeFileSync(path.join(dir, "entity.mdx"), `---\ntitle: "${meta.title}"\n---\n\n# ${meta.title}\n\n${desc}\n\n*\u003csmall\u003eStub — doplní se později.\u003c/small\u003e*\n`);
  created++;
}
console.log(`✅ ${created} extra genre stubs created`);
