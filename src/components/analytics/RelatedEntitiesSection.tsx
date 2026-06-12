"use client";

import { trackRelatedEntityClick } from "@/lib/analytics";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

interface RelatedEntity {
  id: string;
  type: string;
  slug: string;
  title: string;
  degree: number;
  paths: string[];
}

interface RelatedEntitiesProps {
  entities: RelatedEntity[];
  fromEntity: string;
  label?: string;
}

function getEntityLabel(type: string): string {
  const map: Record<string, string> = {
    genre: "Žánry", style: "Styly", theme: "Témata", mood: "Nálady",
    scene: "Scény", location: "Lokality", label: "Labely",
    artist: "Umělci", album: "Alba", track: "Skladby",
  };
  return map[type] ?? type;
}

export function RelatedEntitiesSection({
  entities,
  fromEntity,
  label = "Související",
}: RelatedEntitiesProps) {
  if (entities.length === 0) return null;

  return (
    <section className="mb-10 pb-10 border-b border-white/[0.06]">
      <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
        {label}
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {entities.map((r) => {
          const route = `${TYPE_ROUTE_MAP[r.type as EntityType] ?? `/${r.type}`}/${r.slug}`;
          return (
            <a
              key={r.id}
              href={route}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] rounded-lg text-sm transition-all"
              onClick={() =>
                trackRelatedEntityClick(fromEntity, r.title, "related", r.degree)
              }
            >
              <span className="font-medium text-white">{r.title}</span>
              <span className="text-[10px] font-mono text-white/50">
                {getEntityLabel(r.type)}
              </span>
            </a>
          );
        })}
      </div>
      {entities.some((r) => r.degree === 2) && (
        <details className="mt-3 text-xs text-white/50 cursor-pointer hover:text-white/80 transition-colors">
          <summary className="font-mono uppercase tracking-wider">
            Zobrazit cesty propojení ({entities.filter((r) => r.paths.length > 0).length})
          </summary>
          <ul className="mt-2 space-y-1">
            {entities
              .filter((r) => r.paths.length > 0)
              .map((r) => (
                <li key={r.id} className="text-white/50">
                  <span className="text-white/80">{r.title}</span>:{" "}
                  {r.paths.slice(0, 3).join(", ")}
                  {r.paths.length > 3 && ` (+${r.paths.length - 3} další)`}
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}
