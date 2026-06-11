// ═══════════════════════════════════════════════════════════════
// RAPENGINE — Search helpers
//
// Shared types and helpers for the MiniSearch-powered full‑text
// search UI (header dropdown + /hledej page).
// ═══════════════════════════════════════════════════════════════

import type { EntityType } from "@/lib/content/constants";

/** Search types map 1:1 to EntityType but keep their own namespace. */
export type SearchEntityType = EntityType;

export interface SearchDocument {
  id: string;
  type: EntityType;
  title: string;
  slug: string;
  url: string;
  description: string;
  /** Rich searchable secondary text — realName, origin, label, etc. */
  context?: string;
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  artist: "Rapper",
  album: "Album",
  track: "Skladba",
  genre: "Žánr",
  style: "Styl",
  theme: "Téma",
  mood: "Nálada",
  scene: "Scéna",
  label: "Label",
  location: "Lokalita",
  article: "Článek",
  collective: "Kolektiv",
  producer: "Producent",
  event: "Akce",
};

export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  artist: "#e4ff1a",
  album: "#60a5fa",
  track: "#f472b6",
  genre: "#34d399",
  style: "#a78bfa",
  theme: "#fb923c",
  mood: "#c084fc",
  scene: "#f87171",
  label: "#a78bfa",
  location: "#38bdf8",
  article: "#fb923c",
  collective: "#fbbf24",
  producer: "#4ade80",
  event: "#f472b6",
};
