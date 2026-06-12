import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GoogleAnalytics, PageViewTracker, EngagementTracker } from "@/components/analytics";

export const metadata: Metadata = {
  title: {
    default: "4rap.cz — Česká rapová scéna",
    template: "%s | 4rap.cz",
  },
  description:
    "Největší databáze a magazín české rapové scény. Rappeři, alba, labely, žánry — vše propojeno v jednom místě.",
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
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: "https://4rap.cz",
    siteName: "4rap.cz",
    title: "4rap.cz — Magazín české rapové scény",
    description:
      "Recenze, profily, rozhovory a analýzy z české a slovenské rapové scény.",
  },
  twitter: {
    card: "summary_large_image",
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
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hm947rz7w4pKUGU1Ck1GkD2KcgH9b2Y="
          crossOrigin=""
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <GoogleAnalytics />
        <PageViewTracker />
        <EngagementTracker />
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
