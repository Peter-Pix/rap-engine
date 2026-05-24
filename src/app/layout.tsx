import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getWebSiteSchema } from '@/lib/schema'

const GA_ID = 'G-9SBN9C5869'

export const metadata: Metadata = {
  metadataBase: new URL('https://4rap.cz'),
  title: {
    default: '4rap.cz — Česká rapová scéna',
    template: '%s | 4rap.cz',
  },
  description: 'Budujeme databázy české rapové scény. Rappeři, alba, labely, žánry, atd.— vše propojeno v jednom místě.',
  keywords: ['česká rapová scéna', 'czech rap', 'rapper', 'hip hop', 'drill', 'trap', 'Milion+'],
  authors: [{ name: '4rap.cz', url: 'https://4rap.cz' }],
  creator: '4rap.cz',
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
        alt: '4rap.cz — Největší databáze českého rapu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-default.png'],
  },
  robots: { index: true, follow: true },
  // Google Search Console verification
  // Nastav ENV: NEXT_PUBLIC_GSC_VERIFICATION="abc123..." (z google-site-verification meta tagu)
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION && {
    verification: {
      google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    },
  }),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const schemaData = getWebSiteSchema()
  return (
    <html lang="cs">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {/* Google Analytics 4 — afterInteractive = načte se po hydrataci, neblokuje LCP */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
