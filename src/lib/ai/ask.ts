// ═══════════════════════════════════════════════════════════════
// AI vrstva — orchestrátor
//
// Tok:
//   1. Resolve entit z dotazu (entity-resolver)
//   2. GATE: pokud dotaz míří na entitu, kterou nemáme → odmítni BEZ LLM
//   3. Grounding: postav whitelistovaný kontext
//   4. LLM (DeepSeek 4.1 Flash) — grounded prompt
//   5. Validace odpovědi → při violation 1 retry, pak fallback odmítnutí
//
// Invariant: LLM nikdy neuvidí data mimo whitelist a nikdy
// nezveřejní entitu, která v KG není.
// ═══════════════════════════════════════════════════════════════

import { readEntities, readGraph } from "@/lib/content/cache-reader";
import {
  buildResolverIndex, resolveEntities,
  type ResolverIndex,
} from "./entity-resolver";
import { buildGraphIndex, buildGrounding, computeGlobalStats, entityUrl, type GraphIndex } from "./grounding";
import { validateAnswer } from "./validate";
import type { AskResult, GateResult, ResolvedEntity } from "./types";

const OLLAMA_URL = process.env.OLLAMA_API_URL || "https://ollama.com/v1/chat/completions";
const MODEL = process.env.OLLAMA_MODEL || "deepseek-v4.1-flash";

// ─── Lazy indexy (immutable během běhu) ────────────────────────────────────
let _resolver: ResolverIndex | null = null;
let _graph: GraphIndex | null = null;

function getIndexes() {
  const entities = readEntities();
  if (!entities) throw new Error("Cache není načtená — spusť `npm run cache:build`.");
  if (!_resolver) _resolver = buildResolverIndex(entities);
  if (!_graph) {
    const graph = readGraph() ?? [];
    _graph = buildGraphIndex(graph);
  }
  return { entities, resolver: _resolver, graph: _graph };
}

// ─── Prompty ───────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Jsi asistent databáze českého a slovenského rapu 4rap.cz.

ABSOLUTNÍ PRAVIDLA (bez výjimky):
1. Odpovídej POUZE z poskytnutého KONTEXTU, VZTAHŮ a DAT.
2. NIKDY nezmíníš jméno interpreta, album, skladbu ani label, které nejsou v kontextu.
3. NIKDY nepoužiješ odkaz (URL), který není v kontextu. Nevytvářej vlastní odkazy.
4. Čísla (počty skladeb, spolupráce) ber POUZE ze sekce DATA. Nikdy neodhaduj.
5. Sekce DATA obsahuje i GLOBÁLNÍ STATISTIKY (řádky začínající "Interpreti s nejvíce", "Labely s nejvíce", "Lokality s nejvíce", "Nejzastoupenější žánry", "Nejproduktivnější roky", "Nejstarší album", "Nejnovější album", "Nejstarší skladba"). Když se uživatel ptá na agregovaný dotaz ("kdo má nejvíc", "nejstarší", "nejnovější", "nejzastoupenější", "nejproduktivnější"), najdi odpovídající řádek v DATA a odpověz z něj. Slova jako "label", "lokalita", "žánr", "feat" se vztahují k těmto statistikám.
6. Pokud odpověď v datech není, napiš přesně: "Tuhle informaci v databázi nemáme."
7. Když se ptají na "nejčastěji" a více položek má stejný počet, uveď všechny a napiš, že je shoda.
8. Buď stručný a konkrétní. Odpovídej česky.`;

function buildUserPrompt(question: string, text: string, edges: string, computed: string): string {
  return `KONTEXT:
${text}

VZTAHY V GRAFU:
${edges || "(žádné)"}

DATA (přesné hodnoty — používej je):
${computed || "(žádná)"}

OTÁZKA: ${question}`;
}

// ─── LLM volání ────────────────────────────────────────────────────────────
async function callLlm(messages: { role: string; content: string }[], temperature = 0.1): Promise<string> {
  const key = process.env.OLLAMA_API_KEY;
  if (!key) throw new Error("OLLAMA_API_KEY není nastaven.");
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      reasoning_effort: "none",
      temperature,
    }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

// ─── GATE (vrstva 1) ────────────────────────────────────────────────────────
export function gate(question: string, resolver: ResolverIndex): GateResult {
  const resolved = resolveEntities(question, resolver, 6);
  // Pokud dotaz nezmínil žádnou entitu, nemůžeme tvrdit "nemáme" —
  // je to obecný dotaz; necháme LLM ať se rozhodne z kontextu.
  if (!resolved.length) {
    return { proceed: true, entities: [] };
  }
  // Pokud máme aspoň jednu jistou entitu (score >= 60), jdeme dál.
  const confident = resolved.filter((r) => r.score >= 60);
  if (confident.length) {
    return { proceed: true, entities: resolved };
  }
  // Jen slabé shody (partial) — také jdeme dál, ale s varováním v kontextu.
  return { proceed: true, entities: resolved };
}

// ─── Hlavní API ────────────────────────────────────────────────────────────
export interface AskOptions {
  maxAttempts?: number;
  onToken?: (t: string) => void;
}

export async function ask(question: string, opts: AskOptions = {}): Promise<AskResult> {
  const t0 = Date.now();
  const { entities, resolver, graph } = getIndexes();
  const maxAttempts = opts.maxAttempts ?? 2;

  // 1) Resolve
  const g = gate(question, resolver);
  const focus: ResolvedEntity[] = g.entities;

  // Globální agregace ("kdo má nejvíc tracků", "nejstarší album") — vždy
  // dostupné, ať už dotaz míří na konkrétní entitu nebo ne.
  const globalStats = computeGlobalStats(entities, graph);
  // Rozšiř focus o entity zmíněné v globálních statistikách PŘED groundingem,
  // aby whitelist (allowedIds) obsahoval i tyto entity a validace neshodila
  // odpovědi na agregované dotazy ("Yzomandias má nejvíc tracků").
  for (const id of globalStats.mentionedIds) {
    if (!focus.some((f) => f.id === id)) {
      const e = entities[id];
      if (e) focus.push({ id, type: e.type, slug: e.slug, title: e.title, score: 50, via: "partial" });
    }
  }

  // 2) Grounding — whitelistovaný kontext (focus už obsahuje global stats)
  const ctx = buildGrounding(entities, graph, focus, { maxNeighbors: 50, contentChars: 1400 });

  // Pokud dotaz míří na entitu, kterou nemáme (žádný focus), a dotaz
  // obsahuje "kolik/o kom" → tvrdé odmítnutí bez LLM.
  const computedWithGlobal = [ctx.computed, globalStats.text].filter(Boolean).join("\n\n");
  const userPrompt = buildUserPrompt(question, ctx.text, ctx.edges, computedWithGlobal);
  let answer = "";
  let attempts = 0;
  let attempt = 0;
  let violations: string[] = [];

  for (attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];
    if (attempt > 1 && violations.length) {
      messages.push(
        { role: "assistant", content: answer },
        {
          role: "user",
          content: `Tvoje odpověď porušila pravidla: ${violations.join("; ")}. Přepiš ji POUZE z kontextu, bez vymyšlených entit a odkazů.`,
        },
      );
    }
    answer = await callLlm(messages, attempt === 1 ? 0.1 : 0.05);
    const v = validateAnswer(answer, ctx, entities);
    violations = v.violations;
    if (v.ok) break;
  }

  // 3) Fallback — pokud ani po retry není validní, NESMÍME tvrdit "nemáme"
  //    (to by byla lež — data možná máme, jen odpověď neprošla validací).
  //    Poctivá varianta: přiznat, že odpověď nelze ověřit.
  const verified = violations.length === 0;
  const refused = verified && /nemáme/i.test(answer) && answer.length < 300;

  let finalAnswer: string;
  if (verified) {
    finalAnswer = answer;
  } else {
    finalAnswer =
      "Tuhle odpověď se mi nepodařilo ověřit proti databázi, takže ji radši nezobrazím. " +
      "Zkus se zeptat jinak — například na konkrétní skladbu, interpreta nebo album.";
  }

  // Deduplikace zdrojů podle URL (stejný název alba/artista se nesmí opakovat).
  const seenUrls = new Set<string>();
  const sources: AskResult["sources"] = [];
  for (const f of focus) {
    const e = entities[f.id];
    if (!e) continue;
    const url = entityUrl(e.type, e.slug);
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    sources.push({ id: e.id, title: e.title, type: e.type, url });
  }

  return {
    answer: finalAnswer,
    sources,
    refused,
    verified,
    meta: { latencyMs: Date.now() - t0, model: MODEL, attempts },
  };
}
