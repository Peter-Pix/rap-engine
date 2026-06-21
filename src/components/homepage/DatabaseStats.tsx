// ─── Types ────────────────────────────────────────────────────────────────

interface StatItem {
  value: number;
  label: string;
  hint?: string;
}

interface DatabaseStatsProps {
  counts: {
    artists: number;
    albums: number;
    tracks: number;
    locations: number;
    labels: number;
    genres: number;
    edges: number;
    entities: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("cs-CZ").replace(/\u00a0/g, " ");
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Big typographic stats block: "X interpretů · Y alb · Z vazeb".
 * Sits at the bottom of the homepage — this is the "you're not on a blog,
 * you're in a database" moment.
 */
export function DatabaseStats({ counts }: DatabaseStatsProps) {
  const primary: StatItem[] = [
    { value: counts.artists, label: counts.artists === 1 ? "interpret" : counts.artists < 5 ? "interpreti" : "interpretů" },
    { value: counts.albums, label: counts.albums === 1 ? "album" : counts.albums < 5 ? "alba" : "alb" },
    { value: counts.tracks, label: counts.tracks === 1 ? "track" : counts.tracks < 5 ? "tracky" : "tracků" },
    { value: counts.edges, label: counts.edges === 1 ? "vazba" : counts.edges < 5 ? "vazby" : "vazeb" },
  ];

  const secondary: StatItem[] = [
    { value: counts.locations, label: counts.locations === 1 ? "město" : counts.locations < 5 ? "města" : "měst" },
    { value: counts.labels, label: counts.labels === 1 ? "label" : counts.labels < 5 ? "labely" : "labelů" },
    { value: counts.genres, label: counts.genres === 1 ? "žánr" : counts.genres < 5 ? "žánry" : "žánrů" },
  ];

  return (
    <section className="border-t border-white/[0.08] pt-10 pb-16 mb-12">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/35 mb-6">
        Databáze obsahuje
      </p>

      {/* Primary — big numbers */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-6 mb-10">
        {primary.map((s, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-black text-white tabular-nums tracking-tighter">
              {fmt(s.value)}
            </span>
            <span className="text-base sm:text-lg text-white/55 font-medium">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Secondary — small numbers */}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        {secondary.map((s, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-white/70 tabular-nums">
              {fmt(s.value)}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/35">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
