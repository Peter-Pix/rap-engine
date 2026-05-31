import { NextResponse } from 'next/server'

// GET /api/track-preview/<deezerId>  → { preview, title, duration }
// Preview odkazy z Deezeru jsou podepsané a vyprší → tahá se čerstvý serverově.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.deezer.com/track/${id}`, {
      next: { revalidate: 3600 }, // hodina cache na serveru
    })
    if (!res.ok) return NextResponse.json({ error: 'deezer' }, { status: 502 })
    const t = await res.json()
    if (t?.error || !t?.preview) {
      return NextResponse.json({ error: 'no preview' }, { status: 404 })
    }
    return NextResponse.json(
      { preview: t.preview, title: t.title, duration: t.duration },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}