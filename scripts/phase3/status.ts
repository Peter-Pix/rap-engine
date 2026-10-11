#!/usr/bin/env -S npx tsx
/** Rychlý stav fáze 3 — počty z disku (source of truth). */
import * as fs from "node:fs";
import * as path from "node:path";

const ENTITIES = path.resolve(__dirname, "..", "..", "content", "entities");
let rich = 0, cMeta = 0, upgraded = 0, pending = 0, noindex = 0, gateFail = 0;
for (const d of fs.readdirSync(ENTITIES, { withFileTypes: true })) {
  if (!d.isDirectory() || !d.name.startsWith("track_")) continue;
  const mp = path.join(ENTITIES, d.name, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  const em = m.extraMeta ?? {};
  if (em.phase3Upgraded) upgraded++;
  else if (em.phase3Pas === "C") cMeta++;
  else if (em.phase3GateFail) gateFail++;
  else if (em.phase3Done) rich++;
  else if (em.noindex === true) noindex++;
  else pending++;
}
console.log(`Pás A/B bohatý obsah:   ${rich}`);
console.log(`C→B upgrady (LRCLIB):    ${upgraded}`);
console.log(`C-metadata (noindex):    ${cMeta}`);
console.log(`gate-fail (k opravě):    ${gateFail}`);

console.log(`Čeká (bez obsahu):       ${pending}`);
console.log(`noindex bez fáze 3:      ${noindex}`);
