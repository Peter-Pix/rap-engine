import Link from "next/link";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

// ─── Types ────────────────────────────────────────────────────────────────

export interface FeedItem {
  id: string;
  type: EntityType;
  slug: string;
  title: string;
  publishedAt: string;
  subtitle?: string;
}

interface RecentFeedProps {
  items: FeedItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<EntityType, string> = {
  artist: "Interpret",
  album: "Album",
  label: "Label",
  location: "Město",
  collective: "Kolektiv",
  scene: "Scéna",
  genre: "Žánr",
  style: "Styl",
  theme: "Téma",
  mood: "Nálada",
  producer: "Producent",
  article: "Článek",
  track: "Track",
  event: "Akce",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("cs", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Compact feed of most recently added entities (artists + albums).
 * Shows type badge, title, date — minimal click target to /<route>/<slug>.
 */
export function RecentFeed({ items }: RecentFeedProps) {
  const list = items.slice(0, 8);
  if (list.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">
          Poslední přidané profily
        </h2>
      </div>
      <div className="border-t border-white/[0.06]">
        {list.map((item) => {
          const route = `${TYPE_ROUTE_MAP[item.type] ?? `/${item.type}`}/${item.slug}`;
          const label = TYPE_LABEL[item.type] ?? item.type;
          return (
            <Link
              key={item.id}
              href={route}
              className="grid grid-cols-[88px_1fr_auto] sm:grid-cols-[100px_1fr_auto] gap-3 sm:gap-4 items-center py-3 px-3 -mx-3 border-b border-white/[0.06] transition-colors hover:bg-white/[0.04]"
            >
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">
                {label}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-xs text-white/50 truncate">{item.subtitle}</div>
                )}
              </div>
              <span className="text-[10px] font-mono text-white/35 tabular-nums">
                {formatDate(item.publishedAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
