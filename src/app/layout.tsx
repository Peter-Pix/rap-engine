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
    icon: "/icon.png",
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
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "4rap.cz — Česká rapová scéna",
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
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
