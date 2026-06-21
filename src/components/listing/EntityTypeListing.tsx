import { Metadata } from "next";
import { readEntities, readInbound } from "@/lib/content/cache-reader";
import EntityListingClient from "./EntityListingClient";

interface PageProps {
  type: string;
  title: string;
  description?: string;
}

function getCountLabel(count: number, type: string): string {
  const labels: Record<string, [string, string, string]> = {
    artist: ["interpret", "interprety", "interpretů"],
    album: ["album", "alba", "alb"],
    track: ["skladba", "skladby", "skladeb"],
    genre: ["žánr", "žánry", "žánrů"],
    style: ["styl", "styly", "stylů"],
    theme: ["téma", "témata", "témat"],
    mood: ["nálada", "nálady", "nálad"],
    scene: ["scéna", "scény", "scén"],
    label: ["label", "labely", "labelů"],
    location: ["lokalita", "lokality", "lokalit"],
    article: ["článek", "články", "článků"],
    collective: ["kolektiv", "kolektivy", "kolektivů"],
    producer: ["producent", "producenti", "producentů"],
    event: ["akce", "akce", "akcí"],
  };
  const [one, few, many] = labels[type] || ["položka", "položky", "položek"];
  if (count === 1) return one;
  if (count < 5) return few;
  return many;
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
  const sortByTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);

  return {
    genres: Array.from(allGenres).map(parse).sort(sortByTitle),
    labels: Array.from(allLabels).map(parse).sort(sortByTitle),
    locations: Array.from(allLocations).map(parse).sort(sortByTitle),
    scenes: Array.from(allScenes).map(parse).sort(sortByTitle),
    styles: Array.from(allStyles).map(parse).sort(sortByTitle),
    moods: Array.from(allMoods).map(parse).sort(sortByTitle),
  };
}

export function createListingPage({ type, title, description }: PageProps) {
  return function ListingPage() {
    const entities = readEntities();
    const inbound = readInbound() || {};
    const items = Object.values(entities || {}).filter((e) => e.type === type);

    // Pro locations: spočti kolik artistů na ne ukazuje (inbound HAS_RAPPER-like)
    // Přesněji — kolik artist_ entit má v extraMeta.origin / city titulek téhle lokality
    const rapperCounts: Record<string, number> = {};
    if (type === "location") {
      for (const ent of Object.values(entities || {})) {
        if (!ent.id.startsWith("artist_")) continue;
        const em = ent.extraMeta as Record<string, string> | undefined;
        const origin = em?.origin || em?.city;
        if (!origin) continue;
        rapperCounts[origin] = (rapperCounts[origin] || 0) + 1;
      }
    }

    const filters = extractFilterOptions(entities || {}, type);
    const desc = description || `${items.length} ${getCountLabel(items.length, type)}`;

    // Rozšířit entity o rapperCount (jen pro locations) a hasImage/year/image (pro albums)
    const itemsWithCount = items.map((e) => ({
      ...e,
      rapperCount: type === "location" ? rapperCounts[e.title] ?? 0 : undefined,
      hasImage: type === "album" ? !!e.image : undefined,
      year: type === "album" ? (e.extraMeta as Record<string, unknown> | undefined)?.year as number | undefined : undefined,
      image: type === "album" ? e.image : undefined,
    }));

    return (
      <EntityListingClient
        title={title}
        description={desc}
        entities={itemsWithCount}
        filters={filters}
      />
    );
  };
}

export function createListingMetadata(title: string, description: string): Metadata {
  return { title, description };
}
