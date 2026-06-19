/**
 * 44rap API client — proxy wrapper around https://44rap.base44.app/api
 *
 * All requests are forwarded with the configured api_key.
 * This keeps the secret server-side only.
 */

const BASE44_API = "https://44rap.base44.app/api";
const BASE44_API_KEY = process.env.BASE44_API_KEY || "b9d03638f3df4fe49ee5e75ab26d0803";

interface Base44Response<T = unknown> {
  data?: T;
  error?: string;
}

/**
 * Generic fetch helper for 44rap API.
 */
async function base44Fetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<Base44Response<T>> {
  const url = `${BASE44_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "api_key": BASE44_API_KEY,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `44rap API error ${res.status}: ${body}` };
  }

  const data = await res.json();
  return { data: data as T };
}

// ─── Rapper ───────────────────────────────────────────────────────────────

export interface Base44Rapper {
  id: string;
  artist_name: string;
  real_name?: string;
  country: "CZ" | "SK";
  city?: string;
  birth_date?: string;
  birth_place?: string;
  active_since?: string;
  label?: string;
  style_tags?: string[];
  themes?: string[];
  profile_image_url?: string;
  short_intro?: string;
  what_makes_unique?: string;
  career_summary?: string;
  superpower?: string;
  one_liner?: string;
  influence?: string;
  controversy?: string;
  generation_context?: string;
  status?: "draft" | "published" | "hidden";
  created_date?: string;
  updated_date?: string;
}

export async function getRappers(params?: {
  q?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  sort_by?: string;
}): Promise<Base44Response<Base44Rapper[]>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", JSON.stringify(params.q));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);

  const qs = searchParams.toString();
  return base44Fetch<Base44Rapper[]>(`/entities/Rapper${qs ? `?${qs}` : ""}`);
}

export async function getRapperById(id: string): Promise<Base44Response<Base44Rapper>> {
  return base44Fetch<Base44Rapper>(`/entities/Rapper/${id}`);
}

export async function createRapper(data: Partial<Base44Rapper>): Promise<Base44Response<Base44Rapper>> {
  return base44Fetch<Base44Rapper>("/entities/Rapper", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRapper(id: string, data: Partial<Base44Rapper>): Promise<Base44Response<Base44Rapper>> {
  return base44Fetch<Base44Rapper>(`/entities/Rapper/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRapper(id: string): Promise<Base44Response<void>> {
  return base44Fetch<void>(`/entities/Rapper/${id}`, { method: "DELETE" });
}

// ─── FreshRelease ─────────────────────────────────────────────────────────

export interface Base44FreshRelease {
  id: string;
  title: string;
  artist_name: string;
  featured_artists?: string[];
  release_type: "track" | "ep" | "album" | "mixtape";
  release_date?: string;
  why_notable?: string;
  fresh_score?: number;
  cover_url?: string;
  country?: "CZ" | "SK" | "CZ/SK";
  genres?: string[];
  active?: boolean;
  created_date?: string;
  updated_date?: string;
}

export async function getFreshReleases(params?: {
  q?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  sort_by?: string;
}): Promise<Base44Response<Base44FreshRelease[]>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", JSON.stringify(params.q));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);

  const qs = searchParams.toString();
  return base44Fetch<Base44FreshRelease[]>(`/entities/FreshRelease${qs ? `?${qs}` : ""}`);
}

export async function createFreshRelease(data: Partial<Base44FreshRelease>): Promise<Base44Response<Base44FreshRelease>> {
  return base44Fetch<Base44FreshRelease>("/entities/FreshRelease", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── RapEvent ─────────────────────────────────────────────────────────────

export interface Base44RapEvent {
  id: string;
  title: string;
  event_type: "concert" | "festival" | "party" | "battle" | "meet_greet" | "other";
  event_date: string;
  venue?: string;
  city?: string;
  country?: "CZ" | "SK" | "CZ/SK";
  lineup?: string[];
  headliners?: string[];
  rap_relevance_score: number;
  ticket_url?: string;
  active?: boolean;
}

export async function getRapEvents(params?: {
  q?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  sort_by?: string;
}): Promise<Base44Response<Base44RapEvent[]>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", JSON.stringify(params.q));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);

  const qs = searchParams.toString();
  return base44Fetch<Base44RapEvent[]>(`/entities/RapEvent${qs ? `?${qs}` : ""}`);
}
