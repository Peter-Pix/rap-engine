// ═══════════════════════════════════════════════════════════════
// POZNÁMKA K INTEGRACI
// ═══════════════════════════════════════════════════════════════
//
// Tohle je REFERENCE jak začlenit MagazineHeader do tvého stávajícího
// `src/app/layout.tsx`. NEPŘEPISUJ celý layout.tsx — jen do něj
// přidej / nahrať header sekci.
//
// Pokud máš v `src/components/layout/` starý header, můžeš ho buď:
//   • smazat a nahradit ho importem MagazineHeader,
//   • nechat ho jako legacy a v layout.tsx přepnout import.
//
// Pod headerem zůstává `{children}` které renderuje konkrétní page.
//
// Tvůj reálný layout.tsx může vypadat takhle:
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { MagazineHeader } from '@/components/magazine/MagazineHeader'
import { allClaneks } from 'contentlayer/generated'
import { countRecent } from '@/lib/magazine'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://4rap.cz'),
  title: { default: '4RAP', template: '%s | 4RAP' },
  description: 'Magazín české rapové scény',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // Počet "novinek" pro žluté badge v hlavičce
  const unreadCount = countRecent(allClaneks, 7)

  return (
    <html lang="cs">
      <body className="min-h-screen bg-zinc-950 text-zinc-200 antialiased">
        <MagazineHeader unreadCount={unreadCount} />
        {children}
        {/* Pokud máš existující footer v src/components/layout/Footer.tsx, dej ho sem */}
      </body>
    </html>
  )
}
