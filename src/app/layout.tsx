import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GoogleAnalytics, PageViewTracker, EngagementTracker } from "@/components/analytics";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://4rap.cz"),
  title: {
    default: "4rap.cz — Mapa české rapové scény",
    template: "%s | 4rap.cz",
  },
  description:
    "Největší propojená databáze české a slovenské rapové scény. 1200+ entit — rapperi, alba, labely, lokality, producenti. Najdi koho hledáš, objev koho neznáš.",
  keywords: [
    "česká rapová scéna",
    "czech rap",
    "rapper",
    "hip hop",
    "drill",
    "trap",
  ],
  authors: [{ name: "4rap.cz", url: "https://4rap.cz" }],
  creator: "4rap.cz",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: "https://4rap.cz",
    siteName: "4rap.cz",
    title: "4rap.cz — Mapa české rapové scény",
    description:
      "Největší propojená databáze české a slovenské rapové scény. 1200+ entit — rapperi, alba, labely, lokality, producenti. Najdi koho hledáš, objev koho neznáš.",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "4rap.cz — Mapa české rapové scény",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <GoogleAnalytics />
        <PageViewTracker />
        <EngagementTracker />
        <div className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-md border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-xs">
            <span className="text-zinc-500">🔬</span>
            <span className="text-zinc-400">Součást AI ekosystému</span>
            <a
              href="https://petrpiskacek.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white transition-colors"
            >
              AI Lab
            </a>
            <span className="text-zinc-700">·</span>
            <a
              href="https://karel.petrpiskacek.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white transition-colors"
            >
              Karel Robot
            </a>
          </div>
        </div>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
