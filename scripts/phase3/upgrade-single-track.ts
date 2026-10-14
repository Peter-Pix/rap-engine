#!/usr/bin/env -S npx tsx
/**
 * ⚠️ DEPRECATED (14. 10. 2026) — NESPOUŠTĚT bez ověření dat.
 *
 * Pracuje s daty z Rap Monitoru = interní AI sběrná apka → AI-generated,
 * vyžaduje ověření. Vygenerovaný AI obsah byl z DB odstraněn (Fáze 2.2).
 * Viz scripts/phase3/README-DEPRECATED.md a PLAN-AI-SLOP-TRACKS.md.
 */
/**
 * Cílené povýšení jednoho track stubu pomocí dostupných textů (pás B).
 *
 * Použití: TARGET=track_annet-x-varianta-2 npx tsx scripts/phase3/upgrade-single-track.ts
 *           DRY_RUN=1 TARGET=... npx tsx scripts/phase3/upgrade-single-track.ts
 *
 * Proč samostatně: track může mít phase3Done=true (přeskočil by ho select-batch),
 * ale má RM texty → lze povýšit. Skript obchází batch queue.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  DATA, ENTITIES, ensureData, loadEntities, artistOf, norm, readJson,
  ollamaKey, sleep, OLLAMA_URL, OLLAMA_MODEL,
} from "./lib";

const TARGET = process.env.TARGET || "";
const DRY_RUN = process.env.DRY_RUN === "1";

const FORBIDDEN = ["nelze určit", "nejde určit", "nejsou dostupné informace", "bez dalších informací", "bohužel"];
/** Halucinogenní vzorce — nepodložená tvrzení, která AI nesmí vymýšlet. */
const HALLUCINATION = [
  /\b\d{1,2}\.\s*(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)\s*\d{4}/i,
  /\bmilion(y|u|ů)\b.*(stream|zhlédnut|přehrá)/i,
  /nej(hranější|streamovanější|úspěšnější|prodávanější)/i,
  /\b(hitparád|žebříčk)\w*/i,
  /(ocenění|získal\w*\s+cenu|nominac\w+)/i,
  /(platinum|platinov|zlat\w+\s+desk)/i,
];
const HEDGE = ["pravděpodobně", "možná", "patrně", "neznámý", "nelze", "nemáme", "asi "];

interface Analysis {
  about: string; context?: string; production?: string;
  interpretation: string; impact?: string; themes?: string[]; moods?: string[];
}

function gate(a: Analysis) {
  const reasons: string[] = [];
  const secs = [a.about, a.context, a.production, a.interpretation, a.impact].filter((s) => (s ?? "").trim().length > 60);
  const total = [a.about, a.context, a.production, a.interpretation, a.impact].join(" ").length;
  if (total < 400) reasons.push(`krátký obsah (${total} < 400)`);
  if (secs.length < 3) reasons.push(`jen ${secs.length}/5 sekcí`);
  const blob = JSON.stringify(a).toLowerCase();
  for (const f of FORBIDDEN) if (blob.includes(f)) reasons.push(`zakázaná fráze: ${f}`);
  for (const re of HALLUCINATION) if (re.test(JSON.stringify(a))) reasons.push(`nepodložené tvrzení: ${re}`);
  const words = blob.split(/\s+/);
  const h = words.filter((w) => HEDGE.some((x) => w.includes(x))).length / (words.length || 1);
  if (h > 0.3) reasons.push(`hedge ${(h * 100).toFixed(0)} %`);
  return { pass: reasons.length === 0, reasons };
}

function shorten(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return cut.slice(0, sp > max * 0.6 ? sp : max).replace(/[.,;:!?]$/, "") + "…";
}

async function main() {
  ensureData();
  if (!TARGET) { console.log("Chybí TARGET=<entity_id>"); return; }
  const entities = loadEntities();
  const entity: any = entities[TARGET];
  if (!entity) { console.log(`Entita ${TARGET} nenalezena v cache. Spusť cache:build.`); return; }

  const dir = path.join(ENTITIES, TARGET);
  const meta = readJson<any>(path.join(dir, "meta.json"));
  const artist = artistOf(entity, entities);
  const albumId = (entity.outbound?.BELONGS_TO_ALBUM ?? [])[0];
  const album = albumId ? entities[albumId] : null;
  const albumMeta = albumId ? readJson<any>(path.join(ENTITIES, albumId, "meta.json")) : null;
  const featNames = (entity.outbound?.FEATURES ?? []).map((id: string) => entities[id]?.title).filter(Boolean);

  // RM záznam — hledej podle normalizovaného titulu (bez feat závorky)
  const rmSongs = readJson<any[]>(path.join(DATA, "rm-songs.json"));
  const nrm = (s: string) => norm(String(s ?? "").replace(/\(feat[^)]*\)/gi, ""));
  const rm = rmSongs.find((s) => nrm(s.title) === nrm(entity.title) && nrm(s.artist_name) === nrm(artist))
    ?? rmSongs.find((s) => nrm(s.title) === nrm(entity.title) && (s.lyrics_text ?? "").length > 300);

  let lyrics: string | null = null;
  if (rm?.lyrics_text?.length > 100) lyrics = rm.lyrics_text;
  if (!lyrics) {
    const lf = path.join(DATA, "lyrics", `${TARGET}.txt`);
    if (fs.existsSync(lf)) lyrics = fs.readFileSync(lf, "utf8");
  }

  console.log(`Entita:    ${TARGET} (${artist} — ${entity.title})`);
  console.log(`Album:     ${album?.title ?? "—"} | RM: ${rm ? "ano" : "ne"} | text: ${lyrics ? `${lyrics.length} znaků` : "NENALEZEN"}`);
  if (!lyrics) { console.log("Bez textu nelze povýšit na pás B. Konec."); return; }

  const facts = [
    `SKLADBA: "${entity.title}"`, `UMĚLEC: ${artist}`,
    album?.title ? `ALBUM: ${album.title}` : "",
    albumMeta?.year ? `ROK: ${albumMeta.year}` : "",
    featNames.length ? `HOSTÉ: ${featNames.join(", ")}` : "",
    rm?.producer || rm?.beatmaker ? `PRODUCENT: ${rm.producer || rm.beatmaker}` : "",
  ].filter(Boolean).join("\n");

  const system = `Jsi hudební publicista pro databázi českého a slovenského rapu 4rap.cz.
Píšeš věcné, konkrétní analýzy skladeb. Čtenář je fanoušek.
PRAVIDLA:
- Piš POUZE z přiloženého TEXTU SKLADBY a uvedených METADAT. Nic nedomýšlej.
- ZAKÁZÁNO vymýšlet: data vydání, počty streamů, umístění v hitparádách, "nejhranější/nejstreamovanější", ocenění, prodeje, konkrétní data, která nejsou v metadatech.
- Když nemáš metadata (rok, album, label), NEPIŠ o nich. Sekci Kontext vynech, pokud k ní nemáš fakta.
- Žádný hedge ("pravděpodobně", "možná", "patrně", "je považován za"). Žádná reklama ("skvělá", "ikona").
- Interpretace = o čem text je, motivy, punchlines (s citací). Produkce = jen styl plyne z textu, ŽÁDNÁ jména producentů.
- Česky.
Vrať POUZE validní JSON: about, context, production, interpretation, impact, themes (pole 3-6), moods (pole 2-4).
Pokud nemáš podložená fakta pro context nebo impact, vrať pro ně PRÁZDNÝ string "" — lepší prázdno než výmysl.`;

  const user = `${facts}\n\nTEXT SKLADBY:\n${lyrics.slice(0, 3500)}`;

  const r = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ollamaKey()}` },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], stream: false, think: false, format: "json" }),
  });
  const j: any = await r.json();
  let content: string = j.message?.content ?? "";
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) content = fence[1];
  const a: Analysis = JSON.parse(content.trim());
  const g = gate(a);

  console.log(`\nGate: ${g.pass ? "PASS ✅" : "FAIL ⚠️ " + g.reasons.join("; ")}`);
  console.log(`about: ${shorten(a.about, 200)}`);
  if (DRY_RUN) { console.log("\n[DRY-RUN] Nezapsáno."); return; }

  if (!g.pass) { console.log("Gate fail → nezapisuji (noindex zůstává)."); return; }

  const sec = (h: string, b?: string) => (b ?? "").trim() ? `## ${h}\n\n${b!.trim()}\n\n` : "";
  const mdx = `## O čem je\n\n${a.about.trim()}\n\n` + sec("Kontext", a.context) + sec("Produkce", a.production) + sec("Interpretace", a.interpretation) + sec("Dopad", a.impact);
  fs.writeFileSync(path.join(dir, "entity.mdx"), mdx.trimEnd() + "\n");

  meta.description = shorten(a.about, 158);
  const albumImage = albumMeta?.image;
  if (albumImage && !meta.image) meta.image = albumImage;
  delete meta.extraMeta?.noindex;
  delete meta.extraMeta?.isStub;
  meta.extraMeta = { ...meta.extraMeta, phase3Done: true, phase3Pas: "B", phase3Upgraded: true };
  if (a.themes?.length) meta.extraMeta.themes = a.themes.slice(0, 6);
  if (a.moods?.length) meta.extraMeta.moods = a.moods.slice(0, 4);
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  // žánry z alba
  if (albumId) {
    const relsPath = path.join(dir, "relations.json");
    const rels = fs.existsSync(relsPath) ? readJson<any>(relsPath) : {};
    const albumRels = readJson<any>(path.join(ENTITIES, albumId, "relations.json"));
    if (albumRels.genres?.length && !rels.genres?.length) {
      rels.genres = albumRels.genres;
      fs.writeFileSync(relsPath, JSON.stringify(rels, null, 2) + "\n");
    }
  }
  console.log("\n✅ Zapsáno: entity.mdx, meta.json (noindex sundán), relations.json");
}
main();
