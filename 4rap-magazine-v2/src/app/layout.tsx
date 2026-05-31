// ═══════════════════════════════════════════════════════════════
// LAYOUT.TSX — REFERENCE
//
// Tohle je ukázka, jak vypadá kompletní layout.tsx s novým headerem
// a mobilním menu. NEPŘEPISUJ celý tvůj layout — jen vezmi z něj:
//
//   1. <MagazineHeader unreadCount={...} />  místo starého <Header />
//   2. Optional: schovat starý <Footer /> nebo nechat
//
// Zbytek tvého layoutu (metadata, GA, JsonLd, fonty) zůstává.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next'
import Script from 'next/script'
import { allClaneks } from 'contentlayer/generated'

import { MagazineHeader } from '@/components/magazine/MagazineHeader'
import { countRecent } from '@/lib/magazine'
import { getWebSiteSchema } from '@/lib/schema'

import './globals.css'

const GA_ID = 'G-9SBN9C5869'

export const metadata: Metadata = {
  metadataBase: new URL('https://4rap.cz'),
  title: {
    default: '4rap.cz — Česká rapová scéna',
    template: '%s | 4rap.cz',
  },
  description:
    'Magazín a databáze české rapové scény. Rappeři, alba, labely, žánry — propojené v jednom místě.',
  keywords: ['česká rapová scéna', 'czech rap', 'rapper', 'hip hop', 'drill', 'trap', 'Milion+'],
  authors: [{ name: '4rap.cz', url: 'https://4rap.cz' }],
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://4rap.cz',
    siteName: '4rap.cz',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: '4rap.cz — Magazín české rapové scény',
      },
    ],
  },
  twitter: { card: 'summary_large_image', images: ['/og-default.png'] },
  robots: { index: true, follow: true },
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION && {
    verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION },
  }),
}

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const schemaData = getWebSiteSchema()
  const unreadCount = countRecent(allClaneks, 7)

  return (
    <html lang="cs">
      <body className="min-h-screen bg-zinc-950 text-zinc-200 antialiased">
        <Script
          id="schema-website"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />

        <MagazineHeader unreadCount={unreadCount} />

        {children}

        {/* Google Analytics — zachováno z tvého původního layoutu */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  )
}
