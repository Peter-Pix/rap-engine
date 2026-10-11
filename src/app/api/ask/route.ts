/**
 * POST /api/ask — AI vrstva nad knowledge graph.
 *
 * Body: { question: string, stream?: boolean }
 * Odpověď: AskResult (JSON) nebo SSE stream (text/event-stream).
 *
 * Bezpečnost:
 *  - Rate limit per IP (token bucket).
 *  - Cache odpovědí (stejný dotaz → 0 nákladů).
 *  - Nula halucinací: viz src/lib/ai/ (6 vrstev).
 */

import { ask } from "@/lib/ai/ask";
import { askCache } from "@/lib/ai/cache";
import { askLimiter, identityFromRequest } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";
// AI odpovědi jsou dynamické — nikdy nestaticky.
export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 300;

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...extra } });
}

export async function POST(request: Request): Promise<Response> {
  // ── Parse ────────────────────────────────────────────────────────────────
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const wantStream = body?.stream === true;

  if (!question) {
    return json({ error: "Chybí 'question'." }, 400);
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return json({ error: `Dotaz je příliš dlouhý (max ${MAX_QUESTION_LENGTH} znaků).` }, 400);
  }

  // ── Rate limit ───────────────────────────────────────────────────────────
  const identity = identityFromRequest(request);
  const rl = askLimiter.check(identity);
  if (!rl.allowed) {
    return json(
      { error: "Příliš mnoho dotazů. Zkus to za chvíli.", retryAfterSec: rl.retryAfterSec },
      429,
      { "Retry-After": String(rl.retryAfterSec ?? 5) },
    );
  }

  // ── Cache ────────────────────────────────────────────────────────────────
  const cached = askCache.get(question);
  if (cached) {
    if (wantStream) return streamFromResult(cached);
    return json({ ...cached, meta: { ...cached.meta, cached: true } });
  }

  // ── AI ────────────────────────────────────────────────────────────────────
  let result;
  try {
    result = await ask(question);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "neznámá chyba";
    console.error("[api/ask] chyba:", msg);
    return json({ error: "AI vrstva momentálně nedostupná." }, 503);
  }

  // Cache jen ověřené odpovědi (neověřené neukládat).
  if (result.verified) askCache.set(question, result);

  if (wantStream) return streamFromResult(result);
  return json(result, 200, { "X-RateLimit-Remaining": String(rl.remaining) });
}

/** Pošle hotový výsledek jako SSE (pro konzistentní klient). */
function streamFromResult(result: Awaited<ReturnType<typeof ask>>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Pošleme odpověď po slovech (simulace streamu u cache).
      const words = result.answer.split(/(\s+)/);
      for (const w of words) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ token: w })}\n\n`));
      }
      controller.enqueue(
        enc.encode(
          `data: ${JSON.stringify({
            done: true,
            sources: result.sources,
            verified: result.verified,
            refused: result.refused,
            meta: result.meta,
          })}\n\n`,
        ),
      );
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

/** GET /api/ask — health + statistiky. */
export async function GET(): Promise<Response> {
  return json({ ok: true, cache: askCache.stats(), limiter: askLimiter.stats() });
}
