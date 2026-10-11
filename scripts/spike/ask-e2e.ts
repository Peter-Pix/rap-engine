/** E2E: reálné dotazy přes AI vrstvu (všechny 6 vrstev obrany). */
import { ask } from "@/lib/ai/ask";

const questions = [
  "S kým nejčastěji spolupracoval ADiss?",
  "Kolik má Iso Alp skladeb?",
  "Kolik skladeb má ADiss?",
  "S kým spolupracoval Vladimir 518?",
  "Kdo je vymyšlený rapper Zzqx Pufrt?",
  "O čem je skladba Boh dal love od 7krát3?",
  "Jaké žánry dělá ADiss?",
];

async function main() {
let ok = 0, failed = 0;
for (const q of questions) {
  try {
    const r = await ask(q);
    const status = r.verified ? "✅" : "⚠️ NEVALIDNÍ";
    console.log(`\n${"═".repeat(72)}`);
    console.log(`❓ ${q}`);
    console.log(`⏱  ${r.meta.latencyMs}ms | pokusy ${r.meta.attempts} | ${status} | odmítnuto: ${r.refused}`);
    console.log(`🔗 zdroje: ${r.sources.map((s) => s.title).join(", ") || "(žádné)"}`);
    console.log(`💬 ${r.answer.trim()}`);
    if (r.verified) ok++; else failed++;
  } catch (e) {
    console.log(`\n❌ ${q}\n   CHYBA: ${e}`);
    failed++;
  }
}
console.log(`\n${"─".repeat(72)}`);
console.log(`VÝSLEDEK: ${ok} OK | ${failed} selhalo`);
}

main().catch((e) => { console.error(e); process.exit(1); });
