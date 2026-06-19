/**
 * Rap Monitor API client — proxy wrapper around https://rap-monitor.base44.app/api
 *
 * Entity types: Artist, Song, User
 * Same base44 architecture as 44rap, different schema.
 */

const RAP_MONITOR_API = "https://rap-monitor.base44.app/api";
const RAP_MONITOR_API_KEY = process.env.RAP_MONITOR_API_KEY || "b9d03638f3df4fe49ee5e75ab26d0803";

interface RapMonitorResponse<T = unknown> {
  data?: T;
  error?: string;
}

async function rapMonitorFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<RapMonitorResponse<T>> {
  const url = `${RAP_MONITOR_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "api_key": RAP_MONITOR_API_KEY,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `Rap Monitor API error ${res.status}: ${body}` };
  }

  const data = await res.json();
  return { data: data as T };
}

// ─── Artist ────────────────────────────────────────────────────────────────

export interface RapMonitorArtist {
  id?: string;
  name: string;
  aliases?: string[];
  bio?: string;
  image_url?: string;
  verified?: boolean;
  notes?: string;
  created_date?: string;
  updated_date?: string;
  created_by_id?: string;
}

export async function getArtists(params?: {
  q?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  sort_by?: string;
}): Promise<RapMonitorResponse<RapMonitorArtist[]>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", JSON.stringify(params.q));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);

  const qs = searchParams.toString();
  return rapMonitorFetch<RapMonitorArtist[]>(`/entities/Artist${qs ? `?${qs}` : ""}`);
}

export async function getArtistById(id: string): Promise<RapMonitorResponse<RapMonitorArtist>> {
  return rapMonitorFetch<RapMonitorArtist>(`/entities/Artist/${id}`);
}

export async function createArtist(data: Partial<RapMonitorArtist>): Promise<RapMonitorResponse<RapMonitorArtist>> {
  return rapMonitorFetch<RapMonitorArtist>("/entities/Artist", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateArtist(id: string, data: Partial<RapMonitorArtist>): Promise<RapMonitorResponse<RapMonitorArtist>> {
  return rapMonitorFetch<RapMonitorArtist>(`/entities/Artist/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteArtist(id: string): Promise<RapMonitorResponse<void>> {
  return rapMonitorFetch<void>(`/entities/Artist/${id}`, { method: "DELETE" });
}

export async function restoreArtist(id: string): Promise<RapMonitorResponse<RapMonitorArtist>> {
  return rapMonitorFetch<RapMonitorArtist>(`/entities/Artist/${id}/restore`, { method: "PUT" });
}

// ─── Song ─────────────────────────────────────────────────────────────────

export interface RapMonitorSong {
  id?: string;
  title: string;
  artist_id: string;
  artist_name: string;
  featuring_artist_ids?: string[];
  featuring_names?: string[];
  producer?: string;
  beatmaker?: string;
  album?: string;
  label?: string;
  year?: number;
  release_date?: string;
  duration?: string;
  isrc?: string;
  youtube_url?: string;
  spotify_url?: string;
  apple_music_url?: string;
  has_video?: boolean;
  metadata_sources?: string[];
  metadata_confidence?: number;
  metadata_verified?: boolean;
  metadata_verified_at?: string;
  lyrics_text?: string;
  lyrics_source?: string;
  lyrics_confidence?: number;
  lyrics_verified?: boolean;
  lyrics_partial?: boolean;
  lyrics_note?: string;
  ai_summary_short?: string;
  ai_summary_long?: string;
  ai_main_idea?: string;
  ai_story?: string;
  ai_motifs?: string[];
  ai_emotions?: string[];
  ai_atmosphere?: string;
  ai_message?: string;
  ai_summary_generated_at?: string;
  tags_genre?: string[];
  tags_mood?: string[];
  tags_content?: string[];
  tags_style?: string[];
  tags_custom?: string[];
  ai_tags_generated_at?: string;
  ai_analysis?: string;
  ai_analysis_rating?: number;
  ai_analysis_strengths?: string[];
  ai_analysis_weaknesses?: string[];
  ai_analysis_recommendation?: string;
  ai_analysis_generated_at?: string;
  analysis_status?: "pending" | "metadata_done" | "lyrics_done" | "summary_done" | "tags_done" | "analysis_done" | "complete";
  notes?: string;
  created_date?: string;
  updated_date?: string;
  created_by_id?: string;
}

export async function getSongs(params?: {
  q?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  sort_by?: string;
}): Promise<RapMonitorResponse<RapMonitorSong[]>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", JSON.stringify(params.q));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);

  const qs = searchParams.toString();
  return rapMonitorFetch<RapMonitorSong[]>(`/entities/Song${qs ? `?${qs}` : ""}`);
}

export async function getSongById(id: string): Promise<RapMonitorResponse<RapMonitorSong>> {
  return rapMonitorFetch<RapMonitorSong>(`/entities/Song/${id}`);
}

export async function createSong(data: Partial<RapMonitorSong>): Promise<RapMonitorResponse<RapMonitorSong>> {
  return rapMonitorFetch<RapMonitorSong>("/entities/Song", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSong(id: string, data: Partial<RapMonitorSong>): Promise<RapMonitorResponse<RapMonitorSong>> {
  return rapMonitorFetch<RapMonitorSong>(`/entities/Song/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSong(id: string): Promise<RapMonitorResponse<void>> {
  return rapMonitorFetch<void>(`/entities/Song/${id}`, { method: "DELETE" });
}

export async function restoreSong(id: string): Promise<RapMonitorResponse<RapMonitorSong>> {
  return rapMonitorFetch<RapMonitorSong>(`/entities/Song/${id}/restore`, { method: "PUT" });
}

// ─── User ─────────────────────────────────────────────────────────────────

export interface RapMonitorUser {
  id?: string;
  email: string;
  full_name: string;
  role: "admin" | "user";
  created_date?: string;
  updated_date?: string;
  created_by_id?: string;
}

export async function getUsers(params?: {
  q?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  sort_by?: string;
}): Promise<RapMonitorResponse<RapMonitorUser[]>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", JSON.stringify(params.q));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);

  const qs = searchParams.toString();
  return rapMonitorFetch<RapMonitorUser[]>(`/entities/User${qs ? `?${qs}` : ""}`);
}

export async function getUserById(id: string): Promise<RapMonitorResponse<RapMonitorUser>> {
  return rapMonitorFetch<RapMonitorUser>(`/entities/User/${id}`);
}
