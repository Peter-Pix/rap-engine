/**
 * Proxy endpoint for Rap Monitor API.
 * GET /api/v1/rap-monitor/entities/{EntityType}
 * GET /api/v1/rap-monitor/entities/{EntityType}/{id}
 * POST /api/v1/rap-monitor/entities/{EntityType}
 *
 * Forwards requests to https://rap-monitor.base44.app/api with the server-side API key.
 */

import { withAuth } from "@/lib/api/auth";

const RAP_MONITOR_API = "https://rap-monitor.base44.app/api";
const RAP_MONITOR_API_KEY = process.env.RAP_MONITOR_API_KEY || "b9d03638f3df4fe49ee5e75ab26d0803";

export const GET = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  const url = `${RAP_MONITOR_API}/${pathStr}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      "api_key": RAP_MONITOR_API_KEY,
      "Content-Type": "application/json",
    },
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

export const POST = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");
  const body = await request.text();

  const url = `${RAP_MONITOR_API}/${pathStr}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "api_key": RAP_MONITOR_API_KEY,
      "Content-Type": "application/json",
    },
    body,
  });

  const responseBody = await res.text();
  return new Response(responseBody, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

export const PUT = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");
  const body = await request.text();

  const url = `${RAP_MONITOR_API}/${pathStr}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "api_key": RAP_MONITOR_API_KEY,
      "Content-Type": "application/json",
    },
    body,
  });

  const responseBody = await res.text();
  return new Response(responseBody, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});

export const DELETE = withAuth(async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const pathStr = path.join("/");
  const body = await request.text().catch(() => "");

  const url = `${RAP_MONITOR_API}/${pathStr}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "api_key": RAP_MONITOR_API_KEY,
      "Content-Type": "application/json",
    },
    body: body || undefined,
  });

  const responseBody = await res.text();
  return new Response(responseBody, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});
