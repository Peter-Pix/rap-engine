import { NextResponse } from "next/server";

/**
 * Deezer preview proxy — vrací ČERSTVOU 30s ukázku.
 *
 * Proč proxy: Deezer preview URL jsou podepsané (hdnea token) a expirují
 * za ~15–30 MINUT (ověřeno 12. 10. 2026 — token vypršel po 3 min!) →
 * přímé <audio src> z databáze vrací 403. Tento endpoint při každém
 * požadavku dotáhne čerstvou podepsanou URL z Deezer API a přesměruje
 * (302). Klient tak vždy přehraje funkční ukázku.
 *
 * Bezpečnost: povolujeme jen číselné Deezer track ID → žádné SSRF.
 */

const DEEZER_API = "https://api.deezer.com/track/";

export const runtime = "edge";
// ŽÁDNÁ cache — token expiruje za ~15–30 min, takže redirect URL nesmí
// být cachovaná (jinak by klient přehrál expirovaný 403).

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    const res = await fetch(`${DEEZER_API}${id}`, {
      headers: { "User-Agent": "4rap.cz/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "deezer_error" }, { status: 502 });
    }
    const data = (await res.json()) as { preview?: string; error?: unknown };
    if (!data.preview || data.error) {
      return NextResponse.json({ error: "no_preview" }, { status: 404 });
    }
    // Přesměruj na čerstvou podepsanou URL (NEukládáme ji do cache klienta).
    return NextResponse.redirect(data.preview, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
