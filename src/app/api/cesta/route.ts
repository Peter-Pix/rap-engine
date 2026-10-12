/**
 * GET /api/cesta?from=<id>&to=<id> — nejkratší smysluplná cesta v grafu.
 *
 * Vrací ShortestPathResult: řetězec uzlů + popisky vztahů.
 * Server-only (čte graph.json přes readGraph).
 */
import { findShortestPath } from "@/lib/content/graph-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  if (!from || !to) {
    return Response.json({ error: "Chybí parametry from/to" }, { status: 400 });
  }

  const result = findShortestPath(from, to);
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
