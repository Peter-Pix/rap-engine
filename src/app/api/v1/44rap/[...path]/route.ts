/**
 * Proxy endpoint for 44rap API.
 * GET /api/v1/44rap/entities/{EntityType}
 * GET /api/v1/44rap/entities/{EntityType}/{id}
 * POST /api/v1/44rap/entities/{EntityType}
 *
 * Forwards requests to https://44rap.base44.app/api with the server-side API key.
 */

import { withAuth } from "@/lib/api/auth";

const BASE44_API = "https://44rap.base44.app/api";
const BASE44_API_KEY = process.env.BASE44_API_KEY || "b9d03638f3df4fe49ee5e75ab26d0803";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

function respond(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const OPTIONS = withAuth(async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
});

export const GET = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const url = `${BASE44_API}/${pathStr}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { api_key: BASE44_API_KEY, "Content-Type": "application/json" },
  });

  return respond(await res.text(), res.status);
});

export const POST = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");
  const body = await request.text();
  const url = `${BASE44_API}/${pathStr}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { api_key: BASE44_API_KEY, "Content-Type": "application/json" },
    body,
  });

  return respond(await res.text(), res.status);
});

export const PUT = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");
  const body = await request.text();
  const url = `${BASE44_API}/${pathStr}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { api_key: BASE44_API_KEY, "Content-Type": "application/json" },
    body,
  });

  return respond(await res.text(), res.status);
});

export const DELETE = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");
  const body = await request.text().catch(() => "");
  const url = `${BASE44_API}/${pathStr}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { api_key: BASE44_API_KEY, "Content-Type": "application/json" },
    body: body || undefined,
  });

  return respond(await res.text(), res.status);
});
