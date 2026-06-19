/**
 * UpcomingEventsForArtist — server component
 * Fetchne koncerty z 44rap kde je daný artist v headliners/lineup.
 */

interface RapEvent {
  id: string;
  title: string;
  venue: string;
  city: string;
  country: string;
  event_date: string;
  event_type: string;
  headliners: string[];
  lineup: string[];
  ticket_url: string;
  rap_relevance_score: number;
  active?: boolean;
}

const RAP44_API = "https://44rap.base44.app/api";
const RAP44_KEY = "b9d03638f3df4fe49ee5e75ab26d0803";

async function fetchArtistEvents(artistName: string): Promise<RapEvent[]> {
  try {
    const res = await fetch(`${RAP44_API}/entities/RapEvent?limit=100`, {
      headers: { api_key: RAP44_KEY },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const events: RapEvent[] = await res.json();
    const now = new Date();
    const norm = artistName.toLowerCase().trim();
    return events
      .filter((e) => {
        if (e.active === false) return false;
        if (new Date(e.event_date) < now) return false;
        const inHeadliners = (e.headliners || []).some((h) => h.toLowerCase().trim() === norm);
        const inLineup = (e.lineup || []).some((l) => l.toLowerCase().trim() === norm);
        return inHeadliners || inLineup;
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function UpcomingEventsForArtist({ artistName }: { artistName: string }) {
  const events = await fetchArtistEvents(artistName);

  if (events.length === 0) {
    return (
      <section className="mb-10 pb-10 border-b border-white/[0.06]">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
          🎤 Nadcházející koncerty
        </h2>
        <p className="text-sm text-white/40">Žádné naplánované koncerty.</p>
      </section>
    );
  }

  return (
    <section className="mb-10 pb-10 border-b border-white/[0.06]">
      <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
        🎤 Nadcházející koncerty
      </h2>
      <div className="space-y-2">
        {events.map((e) => {
          const date = new Date(e.event_date);
          const day = date.getDate();
          const month = date.toLocaleString("cs", { month: "short" });
          const eventTypeColor = {
            concert: "bg-[#c8962e]",
            festival: "bg-purple-500",
            battle: "bg-red-500",
          }[e.event_type] ?? "bg-white/30";

          const isHeadliner = (e.headliners || []).some((h) => h.toLowerCase().trim() === artistName.toLowerCase().trim());

          return (
            <a
              key={e.id}
              href={e.ticket_url || "#"}
              target={e.ticket_url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="group grid grid-cols-[50px_1fr_auto] gap-3 items-center py-2.5 px-2 -mx-2 rounded transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex flex-col items-center justify-center w-12 py-1 bg-white/[0.04] group-hover:bg-[#c8962e]/10 transition-colors">
                <span className="text-base font-bold text-white leading-none">{day}</span>
                <span className="text-[9px] font-mono uppercase text-white/50 tracking-wider">{month}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${eventTypeColor}`} />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                    {e.event_type}
                  </span>
                  {isHeadliner && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c8962e] font-bold">
                      Headliner
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{e.title}</h3>
                <p className="text-xs text-white/50 truncate">
                  {e.venue}, {e.city}
                </p>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 group-hover:text-[#c8962e] transition-colors">
                {e.ticket_url ? "Vstupenky →" : ""}
              </div>
            </a>
          );
        })}
      </div>
      <p className="mt-4 text-[10px] font-mono text-white/30">zdroj: 44rap</p>
    </section>
  );
}