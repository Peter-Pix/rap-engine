import fs from "fs";
import path from "path";

const BASE = path.resolve(process.cwd(), "content/entities");

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p: string, data: any) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

// Update Rytmus relations
const rytmusRel = readJson(path.join(BASE, "artist_rytmus", "relations.json"));
rytmusRel.albums = [
  "album_bengoro", "album_si-zabil", "album_kral", "album_fenomen",
  "album_jedini-co-hresi", "album_krstny-otec", "album_bengoro-ii",
  "album_e-r-a", "album_bozk-na-rozlucku", "album_navzdy",
  "album_real-newz", "album_kf-ako-rolls",
];
rytmusRel.artists = ["artist_ego", "artist_separ", "artist_dj-anys", "artist_viktor-sheen", "artist_calin"];
rytmusRel.genres = ["genre_hip-hop", "genre_rap", "genre_street-rap"];
rytmusRel.styles = ["style_street", "style_aggressive"];
rytmusRel.moods = ["mood_confident", "mood_raw", "mood_dark"];
rytmusRel.scenes = ["scene_slovenska-rapova-scena", "scene_mainstream"];
rytmusRel.locations = ["location_kromeriz", "location_piestany"];
rytmusRel.related = ["collective_kontrafakt", "label_tvoj-tatko-records", "label_pozor-records"];
writeJson(path.join(BASE, "artist_rytmus", "relations.json"), rytmusRel);

// Add Rytmus to all his albums
const albums = [
  "album_bengoro", "album_si-zabil", "album_kral", "album_fenomen",
  "album_jedini-co-hresi", "album_krstny-otec", "album_bengoro-ii",
  "album_e-r-a", "album_bozk-na-rozlucku", "album_navzdy",
  "album_real-newz", "album_kf-ako-rolls",
];
for (const al of albums) {
  const alRel = readJson(path.join(BASE, al, "relations.json"));
  alRel.artists = alRel.artists || [];
  if (!alRel.artists.includes("artist_rytmus")) alRel.artists.push("artist_rytmus");
  writeJson(path.join(BASE, al, "relations.json"), alRel);
}

// Kontrafakt albums: ensure Ego + Rytmus + DJ Anys + collective relation
for (const al of ["album_e-r-a", "album_bozk-na-rozlucku", "album_navzdy", "album_real-newz", "album_kf-ako-rolls"]) {
  const alRel = readJson(path.join(BASE, al, "relations.json"));
  alRel.artists = alRel.artists || [];
  ["artist_ego", "artist_rytmus", "artist_dj-anys"].forEach((id) => {
    if (!alRel.artists.includes(id)) alRel.artists.push(id);
  });
  alRel.partOf = alRel.partOf || [];
  if (!alRel.partOf.includes("collective_kontrafakt")) alRel.partOf.push("collective_kontrafakt");
  writeJson(path.join(BASE, al, "relations.json"), alRel);
}

// Pozor Records relation
createStub("label_pozor-records", "label", "Pozor Records", "Rytmusův sublabel pro nové talenty, založen 2016.");
const pozorRel = readJson(path.join(BASE, "label_pozor-records", "relations.json"));
pozorRel.artists = ["artist_rytmus"];
writeJson(path.join(BASE, "label_pozor-records", "relations.json"), pozorRel);

// Location relations
for (const loc of ["location_kromeriz", "location_piestany"]) {
  const locRel = readJson(path.join(BASE, loc, "relations.json"));
  locRel.artists = ["artist_rytmus"];
  writeJson(path.join(BASE, loc, "relations.json"), locRel);
}

// Kontrafakt collective: ensure Rytmus + Ego + DJ Anys
const kontraRel = readJson(path.join(BASE, "collective_kontrafakt", "relations.json"));
kontraRel.artists = ["artist_ego", "artist_rytmus", "artist_dj-anys"];
writeJson(path.join(BASE, "collective_kontrafakt", "relations.json"), kontraRel);

// DJ Anys: occupation
const anysMeta = readJson(path.join(BASE, "artist_dj-anys", "meta.json"));
anysMeta.occupation = ["dj", "producent"];
writeJson(path.join(BASE, "artist_dj-anys", "meta.json"), anysMeta);

// DJ Anys: partOf
const anysRel = readJson(path.join(BASE, "artist_dj-anys", "relations.json"));
anysRel.partOf = ["collective_kontrafakt"];
writeJson(path.join(BASE, "artist_dj-anys", "relations.json"), anysRel);

console.log("Rytmus import done");

function createStub(id: string, type: string, title: string, desc: string) {
  const dir = path.join(BASE, id);
  if (fs.existsSync(dir)) return;
  fs.mkdirSync(dir, { recursive: true });
  const meta = { id, type, title, slug: slugify(title), description: desc };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "entity.mdx"), `---\nid: ${id}\ntype: ${type}\ntitle: ${title}\n---\n\n${desc}\n`);
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify({}, null, 2) + "\n");
}

function slugify(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
