/**
 * Schema.org / JSON-LD builder pro entity stránky.
 *
 * - Vstup: cache entity (typ, slug, title, description, outbound, profile, extraMeta)
 * - Výstup: JSON-LD objekt připravený k vložení do <script type="application/ld+json">
 *
 * Mapování typů:
 *   artist     → MusicGroup
 *   album      → MusicAlbum
 *   label      → MusicRecordLabel / Organization
 *   collective → MusicGroup (podtyp)
 *   producer   → Person
 *   location   → AdministrativeArea / City
 *   scene      → Place
 *   genre      → Genre
 *   style      → Genre
 *   theme      → Thing
 *   mood       → Thing
 *   article    → Article / NewsArticle
 *   event      → Event
 *   track      → MusicRecording
 *
 * Best practices:
 * - Vždy @id jako URL stránky (self-referential).
 * - image je absolutní URL (Schema.org vyžaduje).
 * - genre/member vazby se resolvnou na URL cílové stránky, ne na textové label-y.
 * - sameAs = profile.sources[0..2] (max 3, důvěryhodné zdroje).
 * - isAccessibleForFree: true pro všechno (žádný paywall).
 *
 * Edge cases:
 * - Draft / noindex → negenerovat (Google to neindexuje, zbytečný markup).
 * - Chybějící image → vynechat pole.
 * - Prázdné relations → vynechat pole.
 * - Prázdný sources → vynechat sameAs.
 */

import { getArtistImage } from "@/lib/content/images";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

// ── Types (subset, co potřebujeme) ────────────────────────────────────────

export interface SchemaEntity {
  id: string;
  type: EntityType;
  slug: string;
  title: string;
  description?: string;
  image?: string | null;
  publishedAt?: string;
  outbound?: Record<string, string[]>;
  profile?: Record<string, unknown> | null;
  extraMeta?: Record<string, unknown> | null;
}

export interface BuildJsonLdInput {
  entity: SchemaEntity;
  /** Inbound IDs (jen pro label/collective, kde ukazujeme "kdo u nás je") */
  inboundIds?: string[];
  /** All entities cache — pro resolving title/URL relations */
  allEntities?: Record<string, SchemaEntity>;
  /** Site base URL — typicky https://4rap.cz */
  baseUrl: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Resolve entity ID → absolutní URL. */
function entityUrl(
  id: string,
  allEntities: Record<string, SchemaEntity> | undefined,
  baseUrl: string,
): string | null {
  if (!allEntities) return null;
  const e = allEntities[id];
  if (!e) return null;
  const prefix = TYPE_ROUTE_MAP[e.type as EntityType] ?? `/${e.type}`;
  return `${baseUrl}${prefix}/${e.slug}`;
}

/** Resolve inbound IDs → URL list (limit, drop nulls). */
function inboundUrls(
  ids: string[],
  allEntities: Record<string, SchemaEntity> | undefined,
  baseUrl: string,
  opts: { typeFilter?: EntityType[]; limit?: number } = {},
): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (opts.typeFilter && allEntities && allEntities[id]) {
      if (!opts.typeFilter.includes(allEntities[id].type as EntityType)) continue;
    }
    const u = entityUrl(id, allEntities, baseUrl);
    if (u) out.push(u);
    if (opts.limit && out.length >= opts.limit) break;
  }
  return out;
}

/** Bezpečný absolutní image URL (Schema.org vyžaduje). */
function absImage(
  img: string | null | undefined,
  baseUrl: string,
): string | undefined {
  if (!img) return undefined;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  // leading slash → připojit k baseUrl
  return `${baseUrl}${img.startsWith("/") ? "" : "/"}${img}`;
}

/** Limitovaný sameAs z profile.sources. */
function sameAsFromProfile(profile: Record<string, unknown> | null | undefined): string[] {
  const sources = profile?.sources;
  if (!Array.isArray(sources)) return [];
  return sources
    .filter((s): s is string => typeof s === "string" && s.startsWith("http"))
    .slice(0, 3);
}

/** @id jako self-canonical URL stránky. */
function selfId(entity: SchemaEntity, baseUrl: string): string {
  const prefix = TYPE_ROUTE_MAP[entity.type as EntityType] ?? `/${entity.type}`;
  return `${baseUrl}${prefix}/${entity.slug}`;
}

/** Vyfiltruje draft / stub → ty negenerují Schema.org markup. */
function isIndexable(entity: SchemaEntity): boolean {
  const em = entity.extraMeta ?? {};
  if (em.status === "draft") return false;
  if (em.isStub === true) return false;
  if (entity.extraMeta && (entity.extraMeta as any).status === "draft") return false;
  return true;
}

// ── Per-type builders ────────────────────────────────────────────────────

function buildArtist(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, allEntities, baseUrl } = input;
  const profile = entity.profile ?? {};
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };

  const img = entity.image ?? (getArtistImage(entity.slug) ?? null);
  const abs = absImage(img, baseUrl);
  if (abs) out.image = abs;

  // genre — HAS_STYLE / HAS_THEME (ne všechno je "genre", ale lepší než nic)
  const styleIds = [
    ...(entity.outbound?.HAS_STYLE ?? []),
    ...(entity.outbound?.HAS_THEME ?? []),
  ];
  const genres = styleIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (genres.length) out.genre = genres;

  // foundingLocation — ORIGINATES_FROM
  const origins = (entity.outbound?.ORIGINATES_FROM ?? [])
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (origins.length) out.foundingLocation = origins.map((u) => ({ "@id": u }));

  // member — RELATED_TO (jen artisty, ne label)
  const memberIds = (entity.outbound?.RELATED_TO ?? []).filter((id) =>
    id.startsWith("artist_"),
  );
  const members = memberIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u)
    .map((u) => ({ "@type": "Person", "@id": u }));
  if (members.length) out.member = members;

  // recordLabel — SIGNED_TO
  const labelIds = entity.outbound?.SIGNED_TO ?? [];
  const labels = labelIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (labels.length) out.recordLabel = labels.map((u) => ({ "@id": u }));

  // sameAs (Wikipedia, Spotify, …)
  const sameAs = sameAsFromProfile(profile);
  if (sameAs.length) out.sameAs = sameAs;

  return out;
}

function buildAlbum(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, allEntities, baseUrl } = input;
  const profile = entity.profile ?? {};
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };

  // image (cover)
  const abs = absImage(entity.image, baseUrl);
  if (abs) out.image = abs;

  // byArtist — RELATED_ARTIST
  const artistIds = entity.outbound?.RELATED_ARTIST ?? [];
  const byArtist = artistIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u)
    .map((u) => ({ "@type": "MusicGroup", "@id": u }));
  if (byArtist.length) out.byArtist = byArtist;

  // recordLabel
  const labelIds = entity.outbound?.SIGNED_TO ?? [];
  const labels = labelIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (labels.length) out.recordLabel = labels.map((u) => ({ "@id": u }));

  // datePublished
  if (entity.publishedAt) {
    const d = String(entity.publishedAt);
    // Normalize "2024-01-15" → ISO
    out.datePublished = /^\d{4}-\d{2}-\d{2}/.test(d) ? d : d;
  }

  // genre (ze stylů alb)
  const styleIds = entity.outbound?.HAS_STYLE ?? [];
  const genres = styleIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (genres.length) out.genre = genres;

  // albumProductionType — heuristika: "studio" default; "live" / "compilation" z note
  const note = (profile as any).note as string | undefined;
  if (note?.toLowerCase().includes("kompilac")) {
    out.albumProductionType = "CompilationAlbum";
  } else if (note?.toLowerCase().includes("živě") || note?.toLowerCase().includes(" live")) {
    out.albumProductionType = "LiveAlbum";
  } else {
    out.albumProductionType = "StudioAlbum";
  }

  const sameAs = sameAsFromProfile(profile);
  if (sameAs.length) out.sameAs = sameAs;

  return out;
}

function buildLabel(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, allEntities, baseUrl, inboundIds } = input;
  const profile = entity.profile ?? {};
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicRecordLabel",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };

  // member = artists who SIGNED_TO this label
  const artistMembers = inboundUrls(inboundIds ?? [], allEntities, baseUrl, {
    typeFilter: ["artist"],
    limit: 50,
  });
  if (artistMembers.length) {
    out.member = artistMembers.map((u) => ({ "@type": "Person", "@id": u }));
  }

  // foundingLocation z extraMeta (ne vždy máme outbound)
  const city = (entity.extraMeta as any)?.city as string | undefined;
  if (city) {
    out.location = { "@type": "Place", name: city };
  }

  // foundingDate
  const founded = (entity.extraMeta as any)?.activeSince as string | undefined;
  if (founded && /^\d{4}$/.test(founded)) {
    out.foundingDate = founded;
  }

  const sameAs = sameAsFromProfile(profile);
  if (sameAs.length) out.sameAs = sameAs;

  return out;
}

function buildCollective(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, allEntities, baseUrl, inboundIds } = input;
  const profile = entity.profile ?? {};
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };

  // member — inbound artists (kteří mají tuto crew v related) + outbound HAS_MEMBER
  const outboundMembers = (entity.outbound?.HAS_MEMBER ?? [])
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  const inboundArtists = inboundUrls(inboundIds ?? [], allEntities, baseUrl, {
    typeFilter: ["artist"],
    limit: 50,
  });
  const all = Array.from(new Set([...outboundMembers, ...inboundArtists]));
  if (all.length) {
    out.member = all.map((u) => ({ "@type": "Person", "@id": u }));
  }

  const sameAs = sameAsFromProfile(profile);
  if (sameAs.length) out.sameAs = sameAs;

  return out;
}

function buildProducer(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, baseUrl } = input;
  const profile = entity.profile ?? {};
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
    jobTitle: "Music Producer",
  };
  const img = entity.image ?? null;
  const abs = absImage(img, baseUrl);
  if (abs) out.image = abs;
  const sameAs = sameAsFromProfile(profile);
  if (sameAs.length) out.sameAs = sameAs;
  return out;
}

function buildLocation(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, allEntities, baseUrl } = input;
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "City",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };
  // containedInPlace (z outbound ORIGIN nebo z note/title → heuristika)
  const countries = (entity.outbound?.CONTAINED_IN ?? [])
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (countries.length) out.containedInPlace = countries.map((u) => ({ "@id": u }));
  return out;
}

function buildScene(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, allEntities, baseUrl } = input;
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };
  const locIds = entity.outbound?.LOCATED_IN ?? [];
  const locs = locIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (locs.length) out.containedInPlace = locs.map((u) => ({ "@id": u }));
  return out;
}

function buildGenre(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, baseUrl } = input;
  return {
    "@context": "https://schema.org",
    "@type": "Genre",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };
}

function buildArticle(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, baseUrl } = input;
  const profile = entity.profile ?? {};
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": selfId(entity, baseUrl),
    headline: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
    inLanguage: "cs",
    publisher: {
      "@type": "Organization",
      name: "4rap.cz",
      url: baseUrl,
    },
  };
  if (entity.publishedAt) out.datePublished = entity.publishedAt;
  const author = (profile as any).author as string | undefined;
  if (author) out.author = { "@type": "Person", name: author };
  const sameAs = sameAsFromProfile(profile);
  if (sameAs.length) out.sameAs = sameAs;
  return out;
}

function buildGenericThing(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, baseUrl } = input;
  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Hlavní vstupní bod. Vrací JSON-LD objekt nebo null (draft, chybějící data).
 *
 * Draft / noindex stránky vrací null — markup by Google ignoroval.
 */
export function buildJsonLd(input: BuildJsonLdInput): Record<string, unknown> | null {
  const { entity } = input;
  if (!isIndexable(entity)) return null;

  switch (entity.type) {
    case "artist":
      return buildArtist(input);
    case "album":
      return buildAlbum(input);
    case "label":
      return buildLabel(input);
    case "collective":
      return buildCollective(input);
    case "producer":
      return buildProducer(input);
    case "location":
      return buildLocation(input);
    case "scene":
      return buildScene(input);
    case "genre":
    case "style":
      return buildGenre(input);
    case "article":
      return buildArticle(input);
    case "theme":
    case "mood":
    case "track":
    case "event":
      return buildGenericThing(input);
    default:
      return null;
  }
}
