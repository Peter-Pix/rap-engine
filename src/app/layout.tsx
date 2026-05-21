import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getWebSiteSchema } from '@/lib/schema'

export const metadata: Metadata = {
  metadataBase: new URL('https://4rap.cz'),
  title: {
    default: '4rap.cz — Česká rapová scéna',
    template: '%s | 4rap.cz',
  },
  description: 'Největší databáze a magazín české rapové scény. Rappeři, alba, labely, žánry — vše propojeno v jednom místě.',
  keywords: ['česká rapová scéna', 'czech rap', 'rapper', 'hip hop', 'drill', 'trap', 'Milion+'],
  authors: [{ name: '4rap.cz', url: 'https://4rap.cz' }],
  creator: '4rap.cz',
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://4rap.cz',
    siteName: '4rap.cz',
  },
  twitter: { card: 'summary_large_image' },
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
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
