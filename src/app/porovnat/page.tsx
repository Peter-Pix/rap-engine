import { Metadata } from "next";
import { Suspense } from "react";
import { readEntities } from "@/lib/content/cache-reader";
import PorovnatClient, { type ComparePickerItem } from "./PorovnatClient";

export const metadata: Metadata = {
  title: "Porovnat rappery",
  description:
    "Vyber dva rappery a zjisti, co mají společného — žánry, styly, nálady, labely, města i scény.",
  alternates: { canonical: "https://4rap.cz/porovnat" },
};

/**
 * Server komponenta — nachystá minimální data pro picker + porovnání.
 *
 * Proč ne statické route pro dvojice: C(283,2) ≈ 40 000 kombinací by
 * zabilo build. Porovnání je proto klientské nad předpřipraveným polem.
 */
export default function PorovnatPage() {
  const entities = readEntities() ?? {};

  // Pro picker: jen rappeři (typ artist). Outbound neseme s sebou,
  // aby klient nemusel nic dotahovat.
  const artists: ComparePickerItem[] = Object.values(entities)
    .filter((e) => e.type === "artist")
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      image: e.image ?? null,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "cs"));

  // Resolve mapa pro shody: pouze entity, na které se dá odkazovat
  // (id → title/type/slug). Drží payload malý (bez content/description).
  const lookup: Record<string, { id: string; type: string; slug: string; title: string }> = {};
  for (const e of Object.values(entities)) {
    lookup[e.id] = { id: e.id, type: e.type, slug: e.slug, title: e.title };
  }

  // Všechny skladby (pro sekci „Společné skladby").
  const tracks = Object.values(entities)
    .filter((e) => e.type === "track")
    .map((e) => ({
      id: e.id,
      type: e.type,
      slug: e.slug,
      title: e.title,
      outbound: e.outbound ?? {},
    }));

  // Outbound mapy pro rappery (jen potřebné relace).
  const RELEVANT = [
    "HAS_GENRE",
    "HAS_STYLE",
    "HAS_MOOD",
    "HAS_THEME",
    "RELEASED_BY",
    "SIGNED_TO",
    "BELONGS_TO_SCENE",
    "ORIGINATES_FROM",
  ];

  // Kolaborační relace pro nepřímé propojení (Fáze 5): přímé vazby
  // artist→artist (RELATED_TO/RELATED_ARTIST) + sdílené skladby
  // (track→artist přes HAS_ARTIST/FEATURES).
  const COLLAB = ["RELATED_TO", "RELATED_ARTIST", "HAS_ARTIST", "FEATURES"];

  const outbound: Record<string, Record<string, string[]>> = {};
  for (const e of Object.values(entities)) {
    if (e.type !== "artist") continue;
    const ob: Record<string, string[]> = {};
    for (const rel of RELEVANT) {
      const ids = e.outbound?.[rel];
      if (ids && ids.length > 0) ob[rel] = ids;
    }
    for (const rel of COLLAB) {
      const ids = e.outbound?.[rel];
      if (ids && ids.length > 0) ob[rel] = ids;
    }
    outbound[e.id] = ob;
  }

  // Pro BFS přes sdílené skladby potřebujeme i track outbound (track→artist
  // přes HAS_ARTIST/FEATURES). Přidáme je do stejné adjacency mapy, aby
  // computeIndirectPath mohl procházet artist→track→artist.
  const collabOutbound: Record<string, Record<string, string[]>> = {};
  for (const e of Object.values(entities)) {
    if (e.type !== "track") continue;
    const ob: Record<string, string[]> = {};
    for (const rel of ["HAS_ARTIST", "FEATURES"]) {
      const ids = e.outbound?.[rel];
      if (ids && ids.length > 0) ob[rel] = ids;
    }
    if (Object.keys(ob).length > 0) collabOutbound[e.id] = ob;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-3">
          <span className="text-[#e4ff1a]">Porovnat</span> rappery
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Vyber dva interprety a zjisti, co mají společného — žánry, styly,
          nálady, labely, města i scény.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-20 text-zinc-500">Načítám…</div>
        }
      >
        <PorovnatClient artists={artists} outbound={outbound} collabOutbound={collabOutbound} lookup={lookup} tracks={tracks} />
      </Suspense>
    </div>
  );
}
