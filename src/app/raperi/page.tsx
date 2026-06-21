import { Metadata } from "next";
import { readEntities } from "@/lib/content/cache-reader";
import EntityListingClient from "@/components/listing/EntityListingClient";
import { getArtistImage } from "@/lib/content/images";

export const metadata: Metadata = {
  title: "Rappeři",
  description: "Kompletní seznam českých a slovenských rapperů, producentů a kolektivů.",
};

export default function RaperiListingPage() {
  const entities = readEntities();
  const artists = Object.values(entities || {}).filter((e) => e.type === "artist");

  // Add hasImage flag for sorting
  const artistsWithImage: (typeof artists[number] & { hasImage: boolean })[] = artists.map((e) => ({
    ...e,
    hasImage: getArtistImage(e.slug) !== undefined,
  }));

  const filters = extractFilterOptions(entities || {}, "artist");

  return (
    <EntityListingClient
      title="Rappeři"
      description={`${artists.length} interpretů napříč českou a slovenskou rapovou scénou`}
      entities={artistsWithImage}
      filters={filters}
    />
  );
}

function extractFilterOptions(entities: Record<string, any>, type: string) {
  const allGenres = new Set<string>();
  const allLabels = new Set<string>();
  const allLocations = new Set<string>();
  const allScenes = new Set<string>();
  const allStyles = new Set<string>();
  const allMoods = new Set<string>();

  for (const ent of Object.values(entities)) {
    if (ent.type !== type) continue;
    const ob = ent.outbound || {};
    (ob.HAS_GENRE || []).forEach((id: string) => {
      const g = entities[id];
      if (g) allGenres.add(JSON.stringify({ id, title: g.title }));
    });
    (ob.SIGNED_TO || []).forEach((id: string) => {
      const l = entities[id];
      if (l) allLabels.add(JSON.stringify({ id, title: l.title }));
    });
    (ob.ORIGINATES_FROM || []).forEach((id: string) => {
      const loc = entities[id];
      if (loc) allLocations.add(JSON.stringify({ id, title: loc.title }));
    });
    (ob.BELONGS_TO_SCENE || []).forEach((id: string) => {
      const s = entities[id];
      if (s) allScenes.add(JSON.stringify({ id, title: s.title }));
    });
    (ob.HAS_STYLE || []).forEach((id: string) => {
      const st = entities[id];
      if (st) allStyles.add(JSON.stringify({ id, title: st.title }));
    });
    (ob.HAS_MOOD || []).forEach((id: string) => {
      const m = entities[id];
      if (m) allMoods.add(JSON.stringify({ id, title: m.title }));
    });
  }

  const parse = (s: string) => JSON.parse(s) as { id: string; title: string };
  const sortByTitle = (a: { title: string }, b: { title: string }) =>
    a.title.localeCompare(b.title);

  return {
    genres: Array.from(allGenres).map(parse).sort(sortByTitle),
    labels: Array.from(allLabels).map(parse).sort(sortByTitle),
    locations: Array.from(allLocations).map(parse).sort(sortByTitle),
    scenes: Array.from(allScenes).map(parse).sort(sortByTitle),
    styles: Array.from(allStyles).map(parse).sort(sortByTitle),
    moods: Array.from(allMoods).map(parse).sort(sortByTitle),
  };
}