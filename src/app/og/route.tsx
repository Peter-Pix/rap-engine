import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  rapper: { label: 'RAPPER', color: '#e4ff1a' },
  album: { label: 'ALBUM', color: '#f472b6' },
  label: { label: 'LABEL', color: '#38bdf8' },
  zanr: { label: 'ŽÁNR', color: '#34d399' },
  clanek: { label: 'ČLÁNEK', color: '#fb923c' },
  skladba: { label: 'SKLADBA', color: '#c084fc' },
}

export async function GET(req: NextRequest): Promise<ImageResponse> {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || '4rap.cz'
  const type = searchParams.get('type') || ''
  const label = searchParams.get('label') || ''
  const year = searchParams.get('year') || ''

  const typeInfo = TYPE_LABELS[type]
  const subtitle = [label, year].filter(Boolean).join(' • ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 100px',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(228, 255, 26, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(228, 255, 26, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: typeInfo ? typeInfo.color : '#e4ff1a',
          }}
        />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 1 }}>
          {/* Type badge */}
          {typeInfo && (
            <div
              style={{
                display: 'flex',
                padding: '10px 20px',
                borderRadius: '9999px',
                background: `${typeInfo.color}15`,
                border: `1px solid ${typeInfo.color}30`,
                color: typeInfo.color,
                fontSize: '16px',
                fontWeight: '700',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {typeInfo.label}
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 30 ? '52px' : '64px',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: '1.05',
              letterSpacing: '-0.03em',
              maxWidth: '900px',
              textTransform: type === 'rapper' ? 'uppercase' : 'none',
            }}
          >
            {title}
          </div>

          {/* Subtitle line (label + year) */}
          {subtitle && (
            <div
              style={{
                fontSize: '24px',
                color: '#a1a1aa',
                fontWeight: '500',
                lineHeight: '1.4',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Footer branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              fontWeight: '900',
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: '-0.04em',
            }}
          >
            4rap
            <span style={{ color: '#e4ff1a' }}>.cz</span>
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#52525b',
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Magazín české rapové scény
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
