import fs from "fs";
import path from "path";

const BASE = path.resolve(process.cwd(), "content/entities");

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const stubs = [
  { id: "artist_dj-anys", type: "artist", title: "DJ Anys", desc: "Slovenský DJ a člen Kontrafaktu." },
  { id: "artist_haha-crew", type: "artist", title: "Haha Crew", desc: "Slovenská rapová skupina." },
  { id: "artist_laris-diam", type: "artist", title: "Laris Diam", desc: "Slovenský rapper." },
  { id: "artist_moma", type: "artist", title: "Moma", desc: "Slovenský rapper." },
  { id: "artist_robert-burian", type: "artist", title: "Robert Burian", desc: "Slovenský producent, autor hitu Žijeme len raz." },
  { id: "artist_tomi", type: "artist", title: "Tomi", desc: "Slovenský rapper." },
  { id: "collective_kontrafakt", type: "collective", title: "Kontrafakt", desc: "Největší slovenská rapová skupina." },
  { id: "label_tvoj-tatko-records", type: "label", title: "Tvoj Tatko Records", desc: "Rytmusovo vydavatelství." },
  { id: "location_lucenec", type: "location", title: "Lučenec", desc: "Město na jihu Slovenska, rodiště Egův." },
  { id: "album_e-r-a", type: "album", title: "E.R.A.", desc: "Debutové album Kontrafaktu (2004).", year: 2004 },
  { id: "album_bozk-na-rozlucku", type: "album", title: "Bozk na rozlúčku", desc: "Album Kontrafaktu (2007).", year: 2007 },
  { id: "album_navzdy", type: "album", title: "Navždy", desc: "Album Kontrafaktu (2013).", year: 2013 },
  { id: "album_real-newz", type: "album", title: "Real Newz", desc: "Album Kontrafaktu (2019).", year: 2019 },
  { id: "album_kf-ako-rolls", type: "album", title: "KF ako Rolls", desc: "Album Kontrafaktu (2021).", year: 2021 },
  { id: "album_egotron", type: "album", title: "EGOTRON", desc: "Druhé sólové album Ega (2020).", year: 2020 },
];

for (const s of stubs) {
  const dir = path.join(BASE, s.id);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    const label = s.type === "artist" ? "Umělec" : s.type === "album" ? "Album" : s.type === "collective" ? "Kolektiv" : s.type === "label" ? "Label" : s.type === "location" ? "Lokalita" : s.title;
    fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({
      id: s.id,
      type: s.type,
      title: s.title,
      slug: slugify(s.title),
      description: s.desc,
      ...(s.year ? { year: s.year } : {}),
    }, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "entity.mdx"), `---\nid: ${s.id}\ntype: ${s.type}\ntitle: ${s.title}\n---\n\n${s.desc}\n`);
    fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify({}, null, 2) + "\n");
    console.log(`Created ${s.id}`);
  } else {
    console.log(`Exists ${s.id}`);
  }
}

console.log(`Done: ${stubs.length} stubs`);
