/**
 * GET /api/v1/artists — list/search artists
 * POST /api/v1/artists — create artist (proxied to 44rap)
 */

import { withAuth } from "@/lib/api/auth";
import { readEntities } from "@/lib/content/cache-reader";
import type { CacheEntity } from "@/lib/content/cache-builder";
import { getRappers, createRapper } from "@/lib/api/44rap";

export const GET = withAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const offset = Number(searchParams.get("offset")) || 0;
  const sort = searchParams.get("sort") || "title";

  const entities = readEntities();
  if (!entities) {
    return Response.json({ error: "Cache not built — run npm run cache:build" }, { status: 500 });
  }

  let artists = Object.values(entities).filter((e) => e.type === "artist");

  // Text search across title, description, extraMeta
  if (q) {
    const query = q.toLowerCase();
    artists = artists.filter((a) => {
      const title = a.title?.toLowerCase() ?? "";
      const desc = a.description?.toLowerCase() ?? "";
      const realName = (a.extraMeta?.realName as string)?.toLowerCase() ?? "";
      const origin = (a.extraMeta?.origin as string)?.toLowerCase() ?? "";
      return title.includes(query) || desc.includes(query) || realName.includes(query) || origin.includes(query);
    });
  }

  // Sort
  artists.sort((a, b) => {
    if (sort === "-title") return b.title.localeCompare(a.title);
    if (sort === "activeSince") {
      const ay = Number(a.extraMeta?.activeSince) || 9999;
      const by = Number(b.extraMeta?.activeSince) || 9999;
      return ay - by;
    }
    if (sort === "-activeSince") {
      const ay = Number(a.extraMeta?.activeSince) || 0;
      const by = Number(b.extraMeta?.activeSince) || 0;
      return by - ay;
    }
    return a.title.localeCompare(b.title);
  });

  const total = artists.length;
  const items = artists.slice(offset, offset + limit).map(formatArtist);

  return Response.json({ items, total, offset, limit });
});

export const POST = withAuth(async (request: Request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.artist_name) {
    return Response.json({ error: "Missing required field: artist_name" }, { status: 400 });
  }

  const result = await createRapper(body);
  if (result.error) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json(result.data, { status: 201 });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatArtist(entity: CacheEntity) {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.title,
    description: entity.description,
    realName: entity.extraMeta?.realName ?? null,
    origin: entity.extraMeta?.origin ?? null,
    birthDate: entity.extraMeta?.birthDate ?? null,
    activeSince: entity.extraMeta?.activeSince ?? null,
    status: entity.extraMeta?.status ?? null,
    image: entity.extraMeta?.image ?? null,
    profile: entity.profile ?? null,
    relations: entity.outbound,
    url: `/raperi/${entity.slug}`,
  };
}
