import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Petr Piskáček | Autor 4RAP",
  description:
    "Petr Piskáček (Willy Tea) — rapper, producent a autor 4RAP.cz. Staví strukturovanou databázi české a slovenské rapové scény.",
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
            description:
              "Rapper, hudební producent a autor 4RAP.cz — propojené databáze české a slovenské rapové scény.",
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
          <div className="flex items-start gap-6 mb-14">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/[0.08]">
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-zinc-600 italic">
                PP
              </div>
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#c8962e] mb-2">
                Autor
              </p>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Petr Piskáček
              </h1>
              <p className="mt-3 text-zinc-400 leading-relaxed max-w-xl">
                Rapuju a produkuju jako <strong className="text-zinc-200">Willy Tea</strong>.
                Na 4RAP skládám českou a slovenskou rapovou scénu do jednoho propojeného
                celku — interprety, desky, skladby i vztahy mezi nimi.
              </p>
            </div>
          </div>

          {/* Příběh */}
          <section className="mb-14">
            <h2 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Proč to dělám
            </h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>
                Začínal jsem v Prachaticích, deset let žil v Nottinghamu a sedm v Praze.
                Hudebně jsem přišel od taneční produkce — techno, house, dubstep — než mě
                před pár lety pohltil hip-hop.
              </p>
              <p>
                Rap u nás má víc souvislostí, než se na první pohled zdá. Kdo s kým nahrál,
                kdo odkud je, jaký label stojí za kterým zvukem. Právě tyhle nitky mě baví
                rozplétat — a 4RAP je místo, kde je to vidět celý.
              </p>
            </div>
          </section>

          {/* Databáze v číslech */}
          <section className="mb-14">
            <h2 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Databáze v číslech
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { n: "279", l: "Rapperů" },
                { n: "4 509", l: "Skladeb" },
                { n: "604", l: "Alb" },
                { n: "37 498", l: "Vazeb" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="bg-zinc-900/[0.5] rounded-lg p-4 border border-white/[0.06]"
                >
                  <p className="text-2xl font-black text-white">{s.n}</p>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Kontakt / odkazy */}
          <section>
            <h2 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Kde mě najdeš
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.youtube.com/@WillyTea"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-400 hover:text-[#c8962e] transition-colors inline-flex items-center gap-2"
                >
                  → Willy Tea na YouTube
                </a>
              </li>
              <li>
                <a
                  href="https://bandlab.com/willytea"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-400 hover:text-[#c8962e] transition-colors inline-flex items-center gap-2"
                >
                  → Willy Tea na BandLabu
                </a>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-zinc-400 hover:text-[#c8962e] transition-colors inline-flex items-center gap-2"
                >
                  ← Zpět na 4RAP
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
