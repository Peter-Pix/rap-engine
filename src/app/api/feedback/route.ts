/**
 * POST /api/feedback — nahlášení chyby nebo návrhu na doplnění z webu.
 *
 * Tělo (JSON):
 *   { entityId?: string, entityTitle?: string, entityUrl?: string,
 *     message: string, email?: string, kind?: "chyba" | "doplneni" | "jine" }
 *
 * Odesílá e-mail přes Resend na FEEDBACK_TO_EMAIL. Bez RESEND_API_KEY vrací 503
 * (web pak zobrazí fallback s e-mailem).
 *
 * Bezpečnost: bez rate limitu by šel formulář zneužít na spam. Držíme proto
 * jednoduchý in-memory limit na IP (10 zpráv / 10 min) — stačí pro běžný provoz,
 * není to distribuovaný limit (Vercel instancí může být víc).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_LEN = 4000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

// In-memory rate limit (per instance). Klíč = IP.
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const KIND_LABELS: Record<string, string> = {
  chyba: "Chyba v datech",
  doplneni: "Chybějící / neúplné",
  jine: "Jiné",
};

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return Response.json(
      { error: "Feedback není nakonfigurován." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Příliš mnoho zpráv. Zkus to za chvíli." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (message.length < 3) {
    return Response.json({ error: "Zpráva je příliš krátká." }, { status: 400 });
  }
  if (message.length > MAX_LEN) {
    return Response.json(
      { error: `Zpráva je příliš dlouhá (max ${MAX_LEN} znaků).` },
      { status: 400 },
    );
  }

  const kind = String(body.kind ?? "jine");
  const kindLabel = KIND_LABELS[kind] ?? KIND_LABELS.jine;
  const entityTitle = String(body.entityTitle ?? "").trim();
  const entityId = String(body.entityId ?? "").trim();
  const entityUrl = String(body.entityUrl ?? "").trim();
  const email = String(body.email ?? "").trim();

  // Honeypot — roboti vyplní skryté pole, my tiše zahodíme.
  if (String(body.website ?? "").trim() !== "") {
    return Response.json({ ok: true });
  }

  const subject = entityTitle
    ? `[4rap] ${kindLabel}: ${entityTitle}`
    : `[4rap] ${kindLabel}`;

  const rows: [string, string][] = [
    ["Typ", kindLabel],
    ["Entita", entityTitle || "—"],
    ["ID", entityId || "—"],
    ["URL", entityUrl || "—"],
    ["Kontakt", email || "— (anonym)"],
    ["IP", ip],
  ];

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 12px">Nahlášení z 4rap.cz</h2>
      <table style="border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:2px 12px 2px 0;color:#666">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      <hr style="margin:16px 0;border:none;border-top:1px solid #ddd" />
      <pre style="white-space:pre-wrap;font-size:14px">${escapeHtml(message)}</pre>
    </div>
  `;

  const text = [
    `Typ: ${kindLabel}`,
    `Entita: ${entityTitle || "—"}`,
    `ID: ${entityId || "—"}`,
    `URL: ${entityUrl || "—"}`,
    `Kontakt: ${email || "— (anonym)"}`,
    "",
    message,
  ].join("\n");

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        ...(email ? { reply_to: email } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[feedback] Resend error:", res.status, detail.slice(0, 300));
      return Response.json(
        { error: "Odeslání se nepovedlo. Zkus to prosím později." },
        { status: 502 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[feedback] selhání:", err);
    return Response.json({ error: "Odeslání se nepovedlo." }, { status: 502 });
  }
}
