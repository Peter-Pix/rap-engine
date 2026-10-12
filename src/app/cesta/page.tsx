import { Metadata } from "next";
import { Suspense } from "react";
import { readEntities } from "@/lib/content/cache-reader";
import { resolveArtistImage } from "@/lib/content/images";
import CestaClient, { type CestaArtistItem } from "./CestaClient";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  title: "Cesta mezi rappery",
  description:
    "Najdi nejkratší propojení mezi dvěma rappery — přes featy, producenty, labely, skupiny i scény.",
  alternates: { canonical: "https://4rap.cz/cesta" },
};

export default function CestaPage() {
  const entities = readEntities() ?? {};

  const artists: CestaArtistItem[] = Object.values(entities)
    .filter((e) => e.type === "artist")
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      image: resolveArtistImage(e.slug, e.image) ?? null,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "cs"));

  return (
    <Suspense fallback={null}>
      <CestaClient artists={artists} />
    </Suspense>
  );
}
