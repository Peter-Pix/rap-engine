/**
 * GET /api/v1 — API status and available endpoints
 */

import { withAuth } from "@/lib/api/auth";

export const GET = withAuth(async () => {
  return Response.json({
    name: "4rap Knowledge Graph API",
    version: "1.0",
    endpoints: {
      artists: {
        list: "GET /api/v1/artists?q=&limit=&offset=&sort=",
        get: "GET /api/v1/artists/[slug]",
        create: "POST /api/v1/artists",
        update: "PUT /api/v1/artists/[slug]",
        delete: "DELETE /api/v1/artists/[slug]",
      },
      tracks: {
        list: "GET /api/v1/tracks?artist=&type=&limit=&skip=",
        create: "POST /api/v1/tracks",
      },
      "44rap": {
        proxy: "GET|POST|PUT|DELETE /api/v1/44rap/entities/{EntityType}[/{id}]",
        description: "Direct proxy to 44rap.base44.app API (Rapper, FreshRelease, RapEvent)",
      },
      "rap-monitor": {
        proxy: "GET|POST|PUT|DELETE /api/v1/rap-monitor/entities/{EntityType}[/{id}]",
        description: "Direct proxy to rap-monitor-copy API (Artist, Song, User)",
      },
    },
    auth: "X-API-Key header required",
    cache: {
      entities: 1194,
      artists: 232,
      lastBuild: "See .content-cache/",
    },
  });
});
