/**
 * GET /api/v1/artists/[slug] — get single artist by slug
 * PUT /api/v1/artists/[slug] — update artist (proxied to 44rap)
 * DELETE /api/v1/artists/[slug] — delete artist (proxied to 44rap)
 */

import { withAuth } from "@/lib/api/auth";
import { readEntityBySlug } from "@/lib/content/cache-reader";
import { getRappers, updateRapper, deleteRapper } from "@/lib/api/44rap";

export const GET = withAuth(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const entity = readEntityBySlug("artist", slug);

  if (!entity) {
    return Response.json({ error: "Artist not found" }, { status: 404 });
  }

  return Response.json({
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
    content: entity.content,
    url: `/raperi/${entity.slug}`,
  });
});

export const PUT = withAuth(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const entity = readEntityBySlug("artist", slug);
  if (!entity) {
    return Response.json({ error: "Artist not found in local cache" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Try to find matching 44rap record by artist_name
  const rappers = await getRappers({ q: { artist_name: entity.title } });
  if (rappers.error) {
    return Response.json({ error: rappers.error }, { status: 502 });
  }

  const rapper = Array.isArray(rappers.data) ? rappers.data[0] : null;
  if (!rapper?.id) {
    return Response.json({ error: "No matching 44rap record found" }, { status: 404 });
  }

  const result = await updateRapper(rapper.id, body);
  if (result.error) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json(result.data);
});

export const DELETE = withAuth(async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const entity = readEntityBySlug("artist", slug);
  if (!entity) {
    return Response.json({ error: "Artist not found" }, { status: 404 });
  }

  const rappers = await getRappers({ q: { artist_name: entity.title } });
  if (rappers.error) {
    return Response.json({ error: rappers.error }, { status: 502 });
  }

  const rapper = Array.isArray(rappers.data) ? rappers.data[0] : null;
  if (!rapper?.id) {
    return Response.json({ error: "No matching 44rap record found" }, { status: 404 });
  }

  const result = await deleteRapper(rapper.id);
  if (result.error) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({ deleted: true, id: rapper.id });
});
