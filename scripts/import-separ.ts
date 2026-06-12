import fs from "fs";
import path from "path";

const BASE = path.resolve(process.cwd(), "content/entities");

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p: string, data: any) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

// 1. Fix Separ meta
const meta = readJson(path.join(BASE, "artist_separ", "meta.json"));
meta.origin = "Bratislava, Slovensko";
meta.occupation = ["rapper", "producent"];
writeJson(path.join(BASE, "artist_separ", "meta.json"), meta);

// 2. Fix Separ relations — dedupe albums, add missing relations
const rel = readJson(path.join(BASE, "artist_separ", "relations.json"));
const uniqueAlbums = [...new Set(rel.albums || [])];
rel.albums = uniqueAlbums;
rel.artists = [
  "artist_dame",
  "artist_smart",
  "artist_strapo",
  "artist_snoop-dogg",
  "artist_viktor-sheen",
  "artist_yzomandias",
  "artist_rytmus",
  "artist_ego",
];
rel.genres = ["genre_hip-hop", "genre_rap", "genre_trap", "genre_drill"];
rel.styles = ["style_aggressive", "style_street", "style_melodic"];
rel.moods = ["mood_dark", "mood_raw", "mood_confident"];
rel.scenes = ["scene_slovenska-rapova-scena", "scene_mainstream"];
rel.locations = ["location_bratislava"];
rel.labels = ["label_dms-records", "label_gramo-rokkaz"];
rel.partOf = ["collective_dms"];
rel.related = [
  "collective_dms",
  "label_dms-records",
  "label_gramo-rokkaz",
];
writeJson(path.join(BASE, "artist_separ", "relations.json"), rel);

// 3. Write rich entity.mdx for Separ
const body = `Separ (Michael Kmeť, * 18. listopadu 1986, Bratislava) je slovenský rapper, producent a zakladatel skupiny DMS. Před rapem se aktivně věnoval graffiti — jeho přezdívka vznikla právě z writer prostředí.

Na scéně je od roku 2001, nejprve s **Damem** jako **2kusy**, pak ve skupině **DWS** (Dame, Wrana, Separ). Po rozpadu DWS vznikla legendární **DMS** — nejprve Dame + Metys + Separ, později Dame + Monsignor Separ + Smart.

Sólový debut **Buldozér (2012)** byl označován za přelomový — Separ se definitivně odtrhl od „jen jeden z DMS“ a stal se samostatnou velkou figurou. Následovaly **Pirát (2014)**, **Pancier (2017)**, **OG (2020, #1 SK)** a **Flowdemort (2023, #1 SK, #2 CZ)** s hosty jako Snoop Dogg, Viktor Sheen, Yzomandias.

Rok 2020 byl zlomový i osobně — podstoupil chemoterapii kvůli rakovině, léčba byla úspěšná. Souběžně vychází **OG**, které vládlo slovenským chartám.

V březnu 2025 vydal **Neviem** — 17 tracků s hosty French Montana, Sara Rikas, Samey, Yzomandias, Hard Rico. V roce 2025 odehrál na Tehelnom poli svůj dosud největší koncert (~30 000 lidí) a v roce 2026 míří do pražské O2 areny.`;

fs.writeFileSync(
  path.join(BASE, "artist_separ", "entity.mdx"),
  `---\n` +
  `id: artist_separ\n` +
  `type: artist\n` +
  `title: Separ\n` +
  `realName: Michael Kmeť\n` +
  `origin: Bratislava, Slovensko\n` +
  `birthDate: 1986-11-18\n` +
  `occupation: rapper, producent\n` +
  `---\n\n${body}\n`
);

// 4. Fix album relations — add artist + year
const albums = [
  { id: "album_buldozer", year: 2012 },
  { id: "album_pirat", year: 2014 },
  { id: "album_pancier", year: 2017 },
  { id: "album_og", year: 2020 },
  { id: "album_flowdemort", year: 2023 },
  { id: "album_dovidenia", year: 2024 },
  { id: "album_neviem", year: 2025 },
];
for (const al of albums) {
  const alMeta = readJson(path.join(BASE, al.id, "meta.json"));
  if (!alMeta.year) alMeta.year = al.year;
  writeJson(path.join(BASE, al.id, "meta.json"), alMeta);
  
  const alRel = readJson(path.join(BASE, al.id, "relations.json"));
  alRel.artists = alRel.artists || [];
  if (!alRel.artists.includes("artist_separ")) alRel.artists.push("artist_separ");
  writeJson(path.join(BASE, al.id, "relations.json"), alRel);
}

// 5. DMS collective relations
const dmsRel = readJson(path.join(BASE, "collective_dms", "relations.json"));
dmsRel.artists = ["artist_separ", "artist_dame", "artist_smart"];
dmsRel.labels = ["label_dms-records", "label_gramo-rokkaz"];
writeJson(path.join(BASE, "collective_dms", "relations.json"), dmsRel);

// 6. DMS Records label relations
const dmsLabelRel = readJson(path.join(BASE, "label_dms-records", "relations.json"));
dmsLabelRel.artists = dmsLabelRel.artists || [];
if (!dmsLabelRel.artists.includes("artist_separ")) dmsLabelRel.artists.push("artist_separ");
writeJson(path.join(BASE, "label_dms-records", "relations.json"), dmsLabelRel);

// 7. Gramo Rokkaz label relations
const gramoRel = readJson(path.join(BASE, "label_gramo-rokkaz", "relations.json"));
gramoRel.artists = ["artist_separ", "artist_dame", "artist_smart"];
gramoRel.related = ["collective_dms"];
writeJson(path.join(BASE, "label_gramo-rokkaz", "relations.json"), gramoRel);

// 8. Bratislava location
const bratRel = readJson(path.join(BASE, "location_bratislava", "relations.json"));
bratRel.artists = bratRel.artists || [];
if (!bratRel.artists.includes("artist_separ")) bratRel.artists.push("artist_separ");
writeJson(path.join(BASE, "location_bratislava", "relations.json"), bratRel);

console.log("Separ import done");
