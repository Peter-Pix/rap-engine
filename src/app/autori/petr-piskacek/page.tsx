import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Petr Piskáček | Autor 4RAP",
  description: "Petr Piskáček (Willy Tea) — autor, producent a tvůrce obsahu na 4RAP.cz. Specializuje se na českou a slovenskou rapovou scénu.",
};

export default function PetrPiskacekAuthorPage() {
  return (
    <>
      {/* Schema.org Person markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Petr Piskáček",
            alternateName: "Willy Tea",
            birthDate: "1986-10-28",
            birthPlace: "Prachatice, Česká republika",
            description: "Rapper, hudební producent a tvůrce obsahu. Autor na 4RAP.cz — největší propojené databázi české rapové scény.",
            url: "https://4rap.cz/autori/petr-piskacek",
            sameAs: [
              "https://www.youtube.com/@WillyTea",
              "https://bandlab.com/willytea",
            ],
            knowsAbout: ["Hip-hop", "Rap", "Hudební produkce", "Česká rapová scéna"],
          }),
        }}
      />

      <main className="min-h-screen bg-zinc-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
          {/* Header */}
          <div className="flex items-start gap-6 mb-12">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/[0.08]">
              {/* Placeholder avatar — replace with actual image */}
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-zinc-600 italic">
                PP
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Petr Piskáček
              </h1>
              <p className="mt-1 text-sm text-[#c8962e] font-mono uppercase tracking-widest">
                Autor &amp; Producent
              </p>
              <p className="mt-3 text-zinc-400 leading-relaxed max-w-xl">
                Rapper a hudební producent pod uměleckým jménem **Willy Tea**. 
                Na 4RAP tvořím strukturovaný obsah o české a slovenské rapové scéně — 
                od profilů umělců přes analýzy až po propojování celé scény do jednoho grafu.
              </p>
            </div>
          </div>

          {/* Bio */}
          <section className="mb-12">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              O mně
            </h2>
            <div className="prose prose-invert prose-zinc max-w-none">
              <p className="text-zinc-300 leading-relaxed">
                Narodil jsem se v Prachaticích, deset let jsem žil v Nottinghamu (UK), 
                sedm let v Praze a teď tvořím z Pardubic. Hudebně jsem začínal jako producent 
                taneční hudby — techno, house, dubstep — před pěti lety mě chytil hip-hop.
              </p>
              <p className="text-zinc-300 leading-relaxed mt-4">
                Na 4RAP spojuju svou technickou minulost s láskou k rapu. Cílem není jen 
                katalogizovat scénu, ale ukázat její skryté souvislosti — kdo s kým spolupracoval, 
                kdo kde vyrůstal, jaký label stojí za kterým zvukem.
              </p>
            </div>
          </section>

          {/* Stats */}
          <section className="mb-12">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Statistiky
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/[0.5] rounded-lg p-4 border border-white/[0.06]">
                <p className="text-2xl font-black text-white">1248</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Entit</p>
              </div>
              <div className="bg-zinc-900/[0.5] rounded-lg p-4 border border-white/[0.06]">
                <p className="text-2xl font-black text-white">5896</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Vazeb</p>
              </div>
              <div className="bg-zinc-900/[0.5] rounded-lg p-4 border border-white/[0.06]">
                <p className="text-2xl font-black text-white">19</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Tracků</p>
              </div>
              <div className="bg-zinc-900/[0.5] rounded-lg p-4 border border-white/[0.06]">
                <p className="text-2xl font-black text-white">2026</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Od roku</p>
              </div>
            </div>
          </section>

          {/* Navigation */}
          <section>
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Navigace
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-zinc-400 hover:text-[#c8962e] transition-colors inline-flex items-center gap-2"
                >
                  ← Zpět na homepage
                </Link>
              </li>
              <li>
                <Link
                  href="/raperi"
                  className="text-sm text-zinc-400 hover:text-[#c8962e] transition-colors inline-flex items-center gap-2"
                >
                  → Prohlédnout rappery
                </Link>
              </li>
              <li>
                <Link
                  href="/sceny"
                  className="text-sm text-zinc-400 hover:text-[#c8962e] transition-colors inline-flex items-center gap-2"
                >
                  → Celá síť
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
