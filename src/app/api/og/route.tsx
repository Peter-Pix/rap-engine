import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || '4rap.cz'
  const type = searchParams.get('type') || 'website'
  const meta = searchParams.get('meta') || ''

  const TYPE_COLORS: Record<string, string> = {
    rapper: '#e4ff1a',
    album:  '#60a5fa',
    label:  '#a78bfa',
    zanr:   '#34d399',
    website: '#e4ff1a',
  }
  const accent = TYPE_COLORS[type] || '#e4ff1a'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: '#09090b', padding: '60px',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {/* Grid noise effect */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle at 80% 20%, ${accent}15 0%, transparent 60%)` }} />
        
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'auto' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            4rap<span style={{ color: accent }}>.cz</span>
          </span>
          {type !== 'website' && (
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, backgroundColor: `${accent}15`, border: `1px solid ${accent}30`, padding: '4px 8px', borderRadius: '4px' }}>
              {type}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {meta && (
            <span style={{ fontSize: '18px', color: '#71717a', marginBottom: '12px', fontWeight: 500 }}>{meta}</span>
          )}
          <h1 style={{ fontSize: title.length > 20 ? '52px' : '72px', fontWeight: 900, color: '#fafafa', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            {title}
          </h1>
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '40px' }}>
          <div style={{ height: '2px', width: '40px', backgroundColor: accent, marginRight: '16px' }} />
          <span style={{ fontSize: '14px', color: '#52525b', fontWeight: 500 }}>Česká rapová databáze</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
