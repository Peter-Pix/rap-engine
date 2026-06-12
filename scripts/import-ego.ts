import fs from "fs";
import path from "path";

const BASE = path.resolve(process.cwd(), "content/entities");
const artist = JSON.parse(fs.readFileSync(path.join(BASE, "artist_ego", "meta.json"), "utf8"));
const relations = JSON.parse(fs.readFileSync(path.join(BASE, "artist_ego", "relations.json"), "utf8"));

artist.realName = "Michal Straka";
artist.birthDate = "1983-11-08";
artist.origin = "Lučenec, Slovensko";
artist.occupation = ["rapper", "textař"];

const body = `Ego (Michal Straka, * 8. listopadu 1983, Lučenec) je slovenský rapper, textař a člen legendární skupiny Kontrafakt. Vedle hudby je vystudovaný právník — což se odráží v jeho systematickém přístupu ke kariéře.

Na scéně funguje od druhé poloviny 90. let, nejdřív ve skupině Prízrak s DJ Anysem. V roce 2001 se s Anysem spojil s Rytmusem a vznikl Kontrafakt — největší slovenská rapová skupina všech dob.

Jeho sólový zlom přišel v roce 2012 singlem **Žijeme len raz**, který byl číslem 1 ve slovenských rádiích 13 týdnů po sobě a získal přes 100 milionů zhlédnutí na YouTube. Následovala sólová alba **Precedens** (2017, #1 SK, #2 CZ) a **EGOTRON** (2020).

Ego je unikátní tím, že přirozeně propojuje rap s popem bez ztráty identity — jeho melodická inteligence a „civilní" charisma ho činí jedním z nejpřístupnějších velkých jmen scény. Zároveň funguje jako most mezi generacemi — od staré školy po nové talenty.`;

fs.writeFileSync(path.join(BASE, "artist_ego", "meta.json"), JSON.stringify(artist, null, 2) + "\n");
fs.writeFileSync(path.join(BASE, "artist_ego", "entity.mdx"), `---\nid: artist_ego\ntype: artist\ntitle: Ego\nrealName: Michal Straka\norigin: Lučenec, Slovensko\noccupation: rapper, textař\n---\n\n${body}\n`);

// Ego relations
relations.albums = [
  "album_precedens",
  "album_egotron",
  "album_e-r-a",
  "album_bozk-na-rozlucku",
  "album_navzdy",
  "album_real-newz",
  "album_kf-ako-rolls",
];
relations.artists = [
  "artist_rytmus",
  "artist_separ",
  "artist_dj-anys",
  "artist_ben-cristovao",
  "artist_yzomandias",
  "artist_paulie-garand",
  "artist_gleb",
  "artist_tina",
  "artist_robert-burian",
  "artist_haha-crew",
  "artist_laris-diam",
  "artist_lvcas-dope",
  "artist_tomi",
  "artist_moma",
];
relations.genres = ["genre_hip-hop", "genre_rap", "genre_pop-rap"];
relations.styles = ["style_melodic"];
relations.moods = ["mood_positive", "mood_confident"];
relations.scenes = ["scene_slovenska-rapova-scena", "scene_mainstream"];
relations.related = [
  "collective_kontrafakt",
  "label_tvoj-tatko-records",
];
relations.locations = ["location_lucenec"];

fs.writeFileSync(path.join(BASE, "artist_ego", "relations.json"), JSON.stringify(relations, null, 2) + "\n");

// Album: Precedens — add Ego relation
const precRel = JSON.parse(fs.readFileSync(path.join(BASE, "album_precedens", "relations.json"), "utf8"));
precRel.artists = precRel.artists || [];
if (!precRel.artists.includes("artist_ego")) precRel.artists.push("artist_ego");
fs.writeFileSync(path.join(BASE, "album_precedens", "relations.json"), JSON.stringify(precRel, null, 2) + "\n");

// Album: Egotron — add Ego relation
const egoRel = JSON.parse(fs.readFileSync(path.join(BASE, "album_egotron", "relations.json"), "utf8"));
egoRel.artists = egoRel.artists || [];
if (!egoRel.artists.includes("artist_ego")) egoRel.artists.push("artist_ego");
fs.writeFileSync(path.join(BASE, "album_egotron", "relations.json"), JSON.stringify(egoRel, null, 2) + "\n");

// Kontrafakt albums: add all Kontrafakt members as artists + collective relation
const kontraAlbums = ["album_e-r-a", "album_bozk-na-rozlucku", "album_navzdy", "album_real-newz", "album_kf-ako-rolls"];
for (const alId of kontraAlbums) {
  const alRel = JSON.parse(fs.readFileSync(path.join(BASE, alId, "relations.json"), "utf8"));
  alRel.artists = alRel.artists || [];
  ["artist_ego", "artist_rytmus", "artist_dj-anys"].forEach((id) => {
    if (!alRel.artists.includes(id)) alRel.artists.push(id);
  });
  alRel.partOf = alRel.partOf || [];
  if (!alRel.partOf.includes("collective_kontrafakt")) alRel.partOf.push("collective_kontrafakt");
  fs.writeFileSync(path.join(BASE, alId, "relations.json"), JSON.stringify(alRel, null, 2) + "\n");
}

// Kontrafakt collective relations
const kontraRel = JSON.parse(fs.readFileSync(path.join(BASE, "collective_kontrafakt", "relations.json"), "utf8"));
kontraRel.artists = ["artist_ego", "artist_rytmus", "artist_dj-anys"];
kontraRel.albums = kontraAlbums;
kontraRel.labels = ["label_tvoj-tatko-records"];
kontraRel.genres = ["genre_hip-hop", "genre_rap"];
fs.writeFileSync(path.join(BASE, "collective_kontrafakt", "relations.json"), JSON.stringify(kontraRel, null, 2) + "\n");

// DJ Anys relations
const anysRel = JSON.parse(fs.readFileSync(path.join(BASE, "artist_dj-anys", "relations.json"), "utf8"));
anysRel.partOf = ["collective_kontrafakt"];
const anysMeta = JSON.parse(fs.readFileSync(path.join(BASE, "artist_dj-anys", "meta.json"), "utf8"));
anysMeta.occupation = ["dj", "producent"];
fs.writeFileSync(path.join(BASE, "artist_dj-anys", "relations.json"), JSON.stringify(anysRel, null, 2) + "\n");
fs.writeFileSync(path.join(BASE, "artist_dj-anys", "meta.json"), JSON.stringify(anysMeta, null, 2) + "\n");

console.log("Ego + Kontrafakt batch done");
