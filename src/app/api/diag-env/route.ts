export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const out: Record<string, unknown> = {};
  for (const k of ["RESEND_API_KEY", "FEEDBACK_TO_EMAIL", "FEEDBACK_FROM_EMAIL"]) {
    const v = process.env[k];
    if (v === undefined) { out[k] = "MISSING"; continue; }
    const bad: { i: number; code: number; ch: string }[] = [];
    for (let i = 0; i < v.length; i++) {
      const c = v.charCodeAt(i);
      if (c > 126 || c < 32) bad.push({ i, code: c, ch: v[i] });
    }
    out[k] = {
      len: v.length,
      nonAscii: bad,
      preview: v.replace(/[^\x20-\x7e]/g, "·").slice(0, 8) + "…",
    };
  }
  return Response.json(out);
}
