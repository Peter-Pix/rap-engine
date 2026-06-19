/**
 * GET /api/v1/tracks — list/search tracks (from 44rap FreshRelease)
 * POST /api/v1/tracks — create track (proxied to 44rap FreshRelease)
 */

import { withAuth } from "@/lib/api/auth";
import { getFreshReleases, createFreshRelease } from "@/lib/api/44rap";

export const GET = withAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const skip = Number(searchParams.get("skip")) || 0;
  const sort_by = searchParams.get("sort_by") || "-created_date";
  const artist = searchParams.get("artist");
  const type = searchParams.get("type"); // track, ep, album, mixtape

  // Build query filter
  const q: Record<string, unknown> = {};
  if (artist) q.artist_name = artist;
  if (type) q.release_type = type;

  const result = await getFreshReleases({
    q: Object.keys(q).length > 0 ? q : undefined,
    limit,
    skip,
    sort_by,
  });

  if (result.error) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({
    items: result.data ?? [],
    total: Array.isArray(result.data) ? result.data.length : 0,
    limit,
    skip,
  });
});

export const POST = withAuth(async (request: Request) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.artist_name || !body.release_type) {
    return Response.json({
      error: "Missing required fields: title, artist_name, release_type",
    }, { status: 400 });
  }

  const validTypes = ["track", "ep", "album", "mixtape"];
  if (!validTypes.includes(body.release_type)) {
    return Response.json({
      error: `Invalid release_type. Must be one of: ${validTypes.join(", ")}`,
    }, { status: 400 });
  }

  const result = await createFreshRelease(body);
  if (result.error) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json(result.data, { status: 201 });
});
