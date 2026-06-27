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
  /** Album tracks.json contents (only present for album entities). */
  tracks?: AlbumTracksJson | null;
}

/** Subset of Deezer tracks.json (extended with Rap Monitor enrichment). */
export interface AlbumTrackJson {
  position?: number;
  title?: string;
  title_original?: string;
  duration_sec?: number;
  artists?: string[];
  feat?: string[];
  isrc?: string | null;
  link?: string;
  preview_url?: string;
  spotify_url?: string | null;
  youtube_url?: string | null;
  apple_music_url?: string | null;
  lyrics_text?: string | null;
  lyrics_source?: string | null;
  producer?: string | null;
  beatmaker?: string | null;
  tags_genre?: string[];
  tags_style?: string[];
  tags_mood?: string[];
  ai_summary_short?: string | null;
  ai_emotions?: string[];
  release_date?: string;
}

export interface AlbumTracksJson {
  tracks?: AlbumTrackJson[];
  total_tracks?: number;
  total_duration_sec?: number;
  release_date?: string;
  label?: string;
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

  // Track list (MusicRecording[]) — if tracks.json is available
  const recordings = buildTrackRecordings(input);
  if (recordings.length) out.track = recordings;

  // albumReleaseType — "Single" (1-3 tracks) vs "Album" (4+)
  if (recordings.length > 0 && recordings.length <= 3) {
    out.albumReleaseType = "Single";
  } else if (recordings.length >= 4) {
    out.albumReleaseType = "Album";
  }

  // numTracks (convenience for crawlers)
  if (recordings.length) out.numTracks = recordings.length;

  return out;
}

// ── Standalone Track builder ────────────────────────────────────────────

function buildTrack(input: BuildJsonLdInput): Record<string, unknown> {
  const { entity, allEntities, baseUrl } = input;
  const profile = entity.profile ?? {};
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "@id": selfId(entity, baseUrl),
    name: entity.title,
    url: selfId(entity, baseUrl),
    description: entity.description,
  };

  // image (track cover — typically album cover)
  const abs = absImage(entity.image, baseUrl);
  if (abs) out.image = abs;

  // byArtist — HAS_ARTIST (primary artist)
  const artistIds = entity.outbound?.HAS_ARTIST ?? [];
  const byArtist = artistIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u)
    .map((u) => ({ "@type": "MusicGroup", "@id": u }));
  if (byArtist.length) out.byArtist = byArtist;

  // inAlbum — BELONGS_TO_ALBUM
  const albumIds = entity.outbound?.BELONGS_TO_ALBUM ?? [];
  const inAlbum = albumIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u)
    .map((u) => ({ "@type": "MusicAlbum", "@id": u }));
  if (inAlbum.length) out.inAlbum = inAlbum;

  // FEATURES (featuring artists)
  const featIds = entity.outbound?.FEATURES ?? [];
  const featured = featIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u)
    .map((u) => ({ "@type": "MusicGroup", "@id": u }));
  if (featured.length) out.performer = featured;

  // PRODUCED_BY (producers)
  const prodIds = entity.outbound?.PRODUCED_BY ?? [];
  const producers = prodIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u)
    .map((u) => ({ "@type": "Person", "@id": u }));
  if (producers.length) out.producer = producers;

  // RELEASED_BY (label)
  const labelIds = entity.outbound?.RELEASED_BY ?? [];
  const labels = labelIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (labels.length) out.recordLabel = labels.map((u) => ({ "@id": u }));

  // datePublished
  if (entity.publishedAt) {
    out.datePublished = String(entity.publishedAt);
  }

  // genre
  const styleIds = entity.outbound?.HAS_STYLE ?? [];
  const genres = styleIds
    .map((id) => entityUrl(id, allEntities, baseUrl))
    .filter((u): u is string => !!u);
  if (genres.length) out.genre = genres;

  // duration from profile.duration (seconds)
  const durationSec = (profile as any).duration as number | undefined;
  if (durationSec) {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    out.duration = `PT${m}M${s}S`;
  }

  // sameAs (Spotify, YouTube, Apple Music)
  const sources = (profile as any).sources as string[] | undefined;
  if (sources?.length) {
    out.sameAs = sources.filter((s) => s.startsWith("http")).slice(0, 5);
  }

  return out;
}

/**
 * Build MusicRecording objects from entity.tracks (Deezer tracks.json
 * enriched with Rap Monitor data). One MusicRecording per track.
 *
 * Generates:
 *   - name, position, duration (ISO 8601), isrcCode
 *   - byArtist (resolved from track.artists[] or album.RELATED_ARTIST)
 *   - inAlbum (back-pointer to parent MusicAlbum)
 *   - url (Spotify preferred, fallback Deezer)
 *   - sameAs (Spotify + YouTube + Apple Music + Deezer)
 *   - lyrics (CreativeWork with capped text + source)
 *   - genre (from Rap Monitor tags_genre)
 *   - contributor (producer, beatmaker)
 */
function buildTrackRecordings(input: BuildJsonLdInput): Record<string, unknown>[] {
  const { entity, allEntities, baseUrl } = input;
  const tracks = entity.tracks?.tracks;
  if (!tracks || tracks.length === 0) return [];

  const albumId = selfId(entity, baseUrl);
  const recordings: Record<string, unknown>[] = [];

  for (const track of tracks) {
    if (!track.title) continue;

    const rec: Record<string, unknown> = {
      "@type": "MusicRecording",
      name: track.title,
      // Position-based ID: /alba/{slug}#track-{position}
      "@id": `${albumId}#track-${track.position ?? recordings.length + 1}`,
    };

    // byArtist — resolve track.artists[] against allEntities, fallback to album artist
    if (track.artists?.length && allEntities) {
      const artistMatches: Array<{ "@type": "MusicGroup"; "@id": string; name?: string }> = [];
      for (const name of track.artists) {
        const found = Object.values(allEntities).find(
          (e) => e.type === "artist" && e.title.toLowerCase() === name.toLowerCase(),
        );
        if (found) {
          const url = entityUrl(found.id, allEntities, baseUrl);
          if (url) artistMatches.push({ "@type": "MusicGroup", "@id": url, name: found.title });
        }
      }
      if (artistMatches.length === 0) {
        // Fallback: album's RELATED_ARTIST
        for (const aid of entity.outbound?.RELATED_ARTIST ?? []) {
          const u = entityUrl(aid, allEntities, baseUrl);
          if (u) artistMatches.push({ "@type": "MusicGroup", "@id": u });
        }
      }
      if (artistMatches.length) rec.byArtist = artistMatches;
    }

    // inAlbum (back-pointer to parent)
    rec.inAlbum = { "@type": "MusicAlbum", "@id": albumId };

    // duration — ISO 8601 (PT3M19S)
    if (track.duration_sec) {
      const m = Math.floor(track.duration_sec / 60);
      const s = track.duration_sec % 60;
      rec.duration = `PT${m}M${s}S`;
    }

    // position (1-based)
    if (track.position) rec.position = track.position;

    // ISRC
    if (track.isrc) rec.isrcCode = track.isrc;

    // url (Spotify preferred, else Deezer link)
    const targetUrl = track.spotify_url ?? track.link;
    if (targetUrl) rec.url = targetUrl;

    // sameAs: all music service URLs
    const sameAs: string[] = [];
    if (track.spotify_url) sameAs.push(track.spotify_url);
    if (track.youtube_url) sameAs.push(track.youtube_url);
    if (track.apple_music_url) sameAs.push(track.apple_music_url);
    if (track.link && !sameAs.includes(track.link)) sameAs.push(track.link);
    if (sameAs.length) rec.sameAs = sameAs;

    // lyrics — CreativeWork with capped text + source attribution
    if (track.lyrics_text) {
      rec.lyrics = {
        "@type": "CreativeWork",
        text: track.lyrics_text.slice(0, 5000),
        ...(track.lyrics_source ? { sourceOrganization: track.lyrics_source } : {}),
      };
    }

    // genre (from Rap Monitor AI tags)
    if (track.tags_genre?.length) rec.genre = track.tags_genre;

    // contributor (producer / beatmaker)
    const contributors: Array<{ "@type": "Person"; name: string; role: string }> = [];
    if (track.producer) contributors.push({ "@type": "Person", name: track.producer, role: "Producer" });
    if (track.beatmaker && track.beatmaker !== track.producer) {
      contributors.push({ "@type": "Person", name: track.beatmaker, role: "BeatMaker" });
    }
    if (contributors.length) rec.contributor = contributors;

    // per-track release date (if different from album)
    if (track.release_date && track.release_date !== entity.publishedAt) {
      rec.datePublished = track.release_date;
    }

    recordings.push(rec);
  }

  return recordings;
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
  const extraMeta = (entity.extraMeta ?? {}) as Record<string, unknown>;
  const region = typeof extraMeta.region === "string" ? extraMeta.region : null;

  // Heuristika pro správný Schema.org @type:
  //  1) title === region (např. "Česko" + region "Česko") → Country
  //  2) jinak město → City
  // (region je *země kde leží*, ne typ entity — Bratislava má region="Slovensko",
  //  ale je to město, ne země.)
  let schemaType = "City";
  if (region && entity.title === region) {
    schemaType = "Country";
  }

  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
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
    case "event":
      return buildGenericThing(input);
    case "track":
      return buildTrack(input);
    default:
      return null;
  }
}
