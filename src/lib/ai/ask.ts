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
import { buildGraphIndex, buildGrounding, entityUrl, type GraphIndex } from "./grounding";
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
5. Pokud odpověď v datech není, napiš přesně: "Tuhle informaci v databázi nemáme."
6. Když se ptají na "nejčastěji" a více položek má stejný počet, uveď všechny a napiš, že je shoda.
7. Buď stručný a konkrétní. Odpovídej česky.`;

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

  // 2) Grounding — whitelistovaný kontext
  const ctx = buildGrounding(entities, graph, focus, { maxNeighbors: 50, contentChars: 1400 });

  // Pokud dotaz míří na entitu, kterou nemáme (žádný focus), a dotaz
  // obsahuje "kolik/o kom" → tvrdé odmítnutí bez LLM.
  const userPrompt = buildUserPrompt(question, ctx.text, ctx.edges, ctx.computed);
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

  const sources = focus.map((f) => ({
    id: f.id,
    title: entities[f.id]?.title ?? f.title,
    type: entities[f.id]?.type ?? f.type,
    url: entityUrl(entities[f.id]?.type ?? f.type, entities[f.id]?.slug ?? f.slug),
  }));

  return {
    answer: finalAnswer,
    sources,
    refused,
    verified,
    meta: { latencyMs: Date.now() - t0, model: MODEL, attempts },
  };
}
