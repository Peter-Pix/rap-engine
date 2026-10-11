#!/usr/bin/env -S npx tsx
/**
 * Fáze 3 runner — zpracuje celou C frontu (holá metadata) v dávkách.
 *
 * Pro každou dávku:
 *   1. select-batch (100 skladeb z C fronty)
 *   2. generate-batch (LRCLIB pokus → hit = AI analýza; miss = metadata MDX)
 *   3. pauza mezi dávkami (rate-limit prevence)
 *
 * Běží dokud fronta není prázdná nebo MAX_BATCHES dosaženo.
 * Idempotentní — přeskočí hotové (phase3Done + lyricsAttempts>=2).
 *
 * Použití:
 *   npx tsx scripts/phase3/run-c-queue.ts               # celá fronta
 *   MAX_BATCHES=5 npx tsx scripts/phase3/run-c-queue.ts # max 5 dávek
 */
import { execSync } from "node:child_process";

const MAX_BATCHES = Number(process.env.MAX_BATCHES || 999);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 100);
const PAUSE_MS = Number(process.env.PAUSE_MS || 5000);

function run(cmd: string): { code: number; out: string } {
  try {
    const out = execSync(cmd, { encoding: "utf8", timeout: 15 * 60 * 1000 });
    return { code: 0, out };
  } catch (e: any) {
    return { code: e.status ?? 1, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

async function main() {
let done = 0;
for (let i = 1; i <= MAX_BATCHES; i++) {
  console.log(`\n████ Dávka ${i} ▒ select`);
  const sel = run(`BATCH_SIZE=${BATCH_SIZE} npx tsx scripts/phase3/select-batch.ts`);
  if (sel.code !== 0) { console.log("select selhal:", sel.out.slice(-500)); break; }
  const m = sel.out.match(/Celkem pending:\s+(\d+)/);
  const pendingTotal = m ? Number(m[1]) : -1;
  const s = sel.out.match(/složení: A=(\d+) B=(\d+) C=(\d+)/);
  if (!s) { console.log("dávka prázdná — fronta hotova"); break; }
  if (Number(s[3]) === 0) { console.log("žádné C skladby — hotovo"); break; }

  console.log(`████ Dávka ${i} ▒ generate (A=${s[1]} B=${s[2]} C=${s[3]}, fronta celkem ${pendingTotal})`);
  const gen = run(`npx tsx scripts/phase3/generate-batch.ts`);
  if (gen.code !== 0) { console.log("generate selhal:", gen.out.slice(-800)); break; }
  const tail = gen.out.split("\n").filter(l => l.trim()).slice(-6).join("\n");
  console.log(tail);
  done++;
  if (i < MAX_BATCHES) await new Promise(r => setTimeout(r, PAUSE_MS));
}

console.log(`\n████ RUNNER HOTOV — ${done} dávek (${done * BATCH_SIZE} skladeb)`);
console.log(`Další krok: npm run cache:build && git add content/ && git commit`);
}

main().catch((e) => { console.error(e); process.exit(1); });
