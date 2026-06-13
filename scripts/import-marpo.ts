import fs from "fs";
import path from "path";

const BASE = path.resolve(process.cwd(), "content/entities");

function readJson(p: string) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p: string, d: any) { fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n"); }
function createStub(id: string, type: string, title: string, desc: string, extra: Record<string, any> = {}) {
  const dir = path.join(BASE, id);
  if (fs.existsSync(dir)) return;
  fs.mkdirSync(dir, { recursive: true });
  const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const meta = { id, type, title, slug, description: desc, publishedAt: "2024-01-01", ...extra };
  writeJson(path.join(dir, "meta.json"), meta);
  fs.writeFileSync(path.join(dir, "entity.mdx"), `---\nid: ${id}\ntype: ${type}\ntitle: ${title}\n---\n\n${desc}\n`);
  writeJson(path.join(dir, "relations.json"), {});
  console.log("Created", id);
}

// Stubs
createStub("artist_oty-petrina", "artist", "Ota Petřina", "Legendární český hudebník, otec Marpa.");
createStub("collective_charakter", "collective", "Charakter", "Pražská rapová crew — Marpo, MC Wohnout, Oer, Shareem, DJ Paice.");
createStub("collective_troublegang", "collective", "TroubleGang", "Česko-americké uskupení Marpa — živá kapela, tribal estetika, kmenové publikum.");

// Marpo meta
const meta = readJson(path.join(BASE, "artist_marpo", "meta.json"));
meta.origin = "Praha, Česko";
meta.occupation = ["rapper", "bubeník", "boxer"];
writeJson(path.join(BASE, "artist_marpo", "meta.json"), meta);

// Marpo relations
const rel = readJson(path.join(BASE, "artist_marpo", "relations.json"));
rel.albums = [
  "album_puvod-umeni", "album_marpokalypsa", "album_rapstar",
  "album_knockout", "album_r-ot", "album_lone-survivor",
  "album_dead-man-walking", "album_backwoods-bred",
  "album_cowboys-dreamers", "album_making-country-music-cool-again",
];
rel.artists = [
  "artist_oty-petrina", "artist_gipsy", "artist_renne-dang",
  "artist_hugo-toxxx", "artist_paulie-garand",
];
rel.genres = ["genre_hip-hop", "genre_rap", "genre_trap", "genre_country"];
rel.styles = ["style_aggressive", "style_melodic", "style_experimental"];
rel.moods = ["mood_confident", "mood_raw", "mood_dark"];
rel.scenes = ["scene_mainstream"];
rel.locations = ["location_praha"];
rel.labels = ["label_universal-music"];
rel.partOf = ["collective_charakter", "collective_troublegang"];
rel.related = ["collective_charakter", "collective_troublegang", "label_universal-music"];
writeJson(path.join(BASE, "artist_marpo", "relations.json"), rel);

// Marpo entity.mdx
const body = `Marpo (Otakar Petřina, * 29. ledna 1985, Praha) je český rapper, bubeník a boxer. Je synem legendárního hudebníka Oty Petřiny. S rapem začal ve 13 letech anglicky, později spoluzaložil crew Charakter.

Debut **Původ umění (2005)** produkoval Gipsy, prodáno ~1000 ks. Po battle rap éře (vítěz Rap Fight Vol. 1, Whos The King) vydal **Marpokalypsu (2006)** a **Rapstar (2007, #15 IFPI)**. V letech 2008–2009 působil jako bubeník Chinaski.

V roce 2013 založil **TroubleGang** — živá kapela s tribal estetikou. Následovaly **Knockout (2010)**, **R!OT (2013)**, **Lone Survivor (2016)**, **Dead Man Walking (2018)**. Od roku 2016 se postupně posouval k country — single Táta, pak **Backwoods Bred (2021)**.

V roce 2024 vydal **Cowboys & Dreamers** a v říjnu 2025 **Making Country Music Cool Again** nahrané v Nashvillu. Sám říká: „Už nejsem čistokrevný rapper.“`;

fs.writeFileSync(
  path.join(BASE, "artist_marpo", "entity.mdx"),
  `---\n` +
  `id: artist_marpo\n` +
  `type: artist\n` +
  `title: Marpo\n` +
  `realName: Otakar Petřina\n` +
  `origin: Praha, Česko\n` +
  `birthDate: 1985-01-29\n` +
  `occupation: rapper, bubeník, boxer\n` +
  `---\n\n${body}\n`
);

// Album years
const albums = [
  { id: "album_puvod-umeni", year: 2005 },
  { id: "album_marpokalypsa", year: 2006 },
  { id: "album_rapstar", year: 2007 },
  { id: "album_knockout", year: 2010 },
  { id: "album_r-ot", year: 2013 },
  { id: "album_lone-survivor", year: 2016 },
  { id: "album_dead-man-walking", year: 2018 },
  { id: "album_backwoods-bred", year: 2021 },
  { id: "album_cowboys-dreamers", year: 2024 },
  { id: "album_making-country-music-cool-again", year: 2025 },
];
for (const al of albums) {
  const alMeta = readJson(path.join(BASE, al.id, "meta.json"));
  if (!alMeta.year) alMeta.year = al.year;
  writeJson(path.join(BASE, al.id, "meta.json"), alMeta);
  const alRel = readJson(path.join(BASE, al.id, "relations.json"));
  alRel.artists = alRel.artists || [];
  if (!alRel.artists.includes("artist_marpo")) alRel.artists.push("artist_marpo");
  writeJson(path.join(BASE, al.id, "relations.json"), alRel);
}

console.log("Marpo import done");
