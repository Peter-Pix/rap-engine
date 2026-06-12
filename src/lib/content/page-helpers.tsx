import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveFromSlug, getRouteParamsForType } from "@/lib/content/route-resolver";
import { readEntityById, readInboundFor, readEntities } from "@/lib/content/cache-reader";
import { renderMdx } from "@/lib/content/mdx";
import { getRegistryEntry } from "@/lib/content/relation-registry";
import {
  getSimilarArtists,
  getRelatedEntities,
  DEFAULT_WEIGHTS,
} from "@/lib/content/graph-query";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

// ─── Metadata ─────────────────────────────────────────────────────────────

export function generatePageMetadata(
  type: string,
  slug: string,
): Metadata | null {
  const id = resolveFromSlug(type, slug);
  if (!id) return null;

  const entity = readEntityById(id);
  if (!entity) return null;

  return {
    title: entity.title,
    description: entity.description || undefined,
    openGraph: {
      title: entity.title,
      description: entity.description || undefined,
      type: "article",
    },
  };
}

// ─── Static Params ────────────────────────────────────────────────────────

export function generatePageStaticParams(type: string) {
  return getRouteParamsForType(type).map(({ slug }) => ({ slug }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getEntityLabel(type: string): string {
  const map: Record<string, string> = {
    genre: "Žánry",
    style: "Styly",
    theme: "Témata",
    mood: "Nálady",
    scene: "Scény",
    location: "Lokality",
    label: "Labely",
    artist: "Umělci",
    album: "Alba",
    track: "Skladby",
  };
  return map[type] ?? type;
}

// ─── Shared Page Component ────────────────────────────────────────────────

export function EntityPage({
  type,
  slug,
}: {
  type: string;
  slug: string;
}): React.ReactNode {
  const id = resolveFromSlug(type, slug);
  if (!id) notFound();

  const entity = readEntityById(id);
  if (!entity) notFound();

  const allEntities = readEntities();

  // Resolve inbound backlinks
  const inboundIds = readInboundFor(id);
  const inboundEntities = inboundIds
    .map((iid) => {
      const e = allEntities?.[iid];
      if (!e) return null;
      const route = `${TYPE_ROUTE_MAP[e.type as EntityType] ?? `/${e.type}`}/${e.slug}`;
      return { id: e.id, type: e.type, slug: e.slug, title: e.title, route };
    })
    .filter(Boolean) as Array<{
      id: string;
      type: string;
      slug: string;
      title: string;
      route: string;
    }>;

  // Group outbound relations
  const relations: Array<{
    key: string;
    label: string;
    targets: Array<{
      id: string;
      type: string;
      slug: string;
      title: string;
      route: string;
    }>;
  }> = [];

  for (const [authoringKey, targetIds] of Object.entries(entity.outbound)) {
    if (!targetIds.length) continue;
    const entry = getRegistryEntry(authoringKey);
    const label = entry?.description ?? authoringKey;

    const targets = targetIds
      .map((tid) => {
        const e = allEntities?.[tid];
        if (!e) return null;
        const route = `${TYPE_ROUTE_MAP[e.type as EntityType] ?? `/${e.type}`}/${e.slug}`;
        return { id: e.id, type: e.type, slug: e.slug, title: e.title, route };
      })
      .filter(Boolean) as Array<{
        id: string;
        type: string;
        slug: string;
        title: string;
        route: string;
      }>;

    if (targets.length > 0) {
      relations.push({ key: authoringKey, label, targets });
    }
  }

  // ── Graph query: similar artists & related entities ──────────────
  let similar = entity.type === "artist"
    ? getSimilarArtists(id, DEFAULT_WEIGHTS, 0.1, 5)
    : [];
  const related = getRelatedEntities(id, 8).filter(
    (r) => r.id !== id,
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="text-xs font-mono font-bold uppercase tracking-widest text-[#e4ff1a] mb-2">
          {getEntityLabel(type)}
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white uppercase leading-[0.92]">
          {entity.title}
        </h1>
        {entity.description && (
          <p className="mt-3 text-base sm:text-lg text-zinc-400 max-w-2xl">
            {entity.description}
          </p>
        )}
        {entity.publishedAt && (
          <time
            className="mt-3 block text-xs font-mono uppercase tracking-widest text-zinc-600"
            dateTime={entity.publishedAt}
          >
            Publikováno {entity.publishedAt}
            {entity.updatedAt && ` · Aktualizováno ${entity.updatedAt}`}
          </time>
        )}
      </header>

      {/* ── MDX Content ─────────────────────────────────────────────── */}
      {"content" in entity && (entity as { content?: string }).content && (
        <section className="mb-10 prose prose-invert max-w-none">
          {renderMdx((entity as { content: string }).content)}
        </section>
      )}

      {/* ── Relations ───────────────────────────────────────────────── */}
      {relations.length > 0 && (
        <section className="mb-10 pb-10 border-b border-white/[0.06]">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
            Vazby
          </h2>
          <div className="space-y-5">
            {relations.map(({ key, label, targets }) => (
              <div key={key}>
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  {label}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {targets.map((t) => (
                    <a
                      key={t.id}
                      href={t.route}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] rounded-lg text-sm transition-all"
                    >
                      <span className="font-medium text-zinc-200">{t.title}</span>
                      <span className="text-[10px] font-mono text-zinc-600">
                        {getEntityLabel(t.type)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Similar Artists (only for artist entities) ────────────── */}
      {similar.length > 0 && (
        <section className="mb-10 pb-10 border-b border-white/[0.06]">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
            Podobní interpreti
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {similar.map((s) => {
              const route = `${TYPE_ROUTE_MAP[s.type as EntityType] ?? `/${s.type}`}/${s.slug}`;
              return (
                <a
                  key={s.id}
                  href={route}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[#e4ff1a]/[0.3] rounded-lg text-sm transition-all"
                >
                  <span className="font-medium text-zinc-200">{s.title}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {Math.round(s.score * 100)}%
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Related Entities ──────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="mb-10 pb-10 border-b border-white/[0.06]">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
            Související
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => {
              const route = `${TYPE_ROUTE_MAP[r.type as EntityType] ?? `/${r.type}`}/${r.slug}`;
              return (
                <a
                  key={r.id}
                  href={route}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] rounded-lg text-sm transition-all"
                >
                  <span className="font-medium text-zinc-200">{r.title}</span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    {getEntityLabel(r.type)}
                  </span>
                </a>
              );
            })}
          </div>
          {related.some((r) => r.degree === 2) && (
            <details className="mt-3 text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
              <summary className="font-mono uppercase tracking-wider">
                Zobrazit cesty propojení ({related.filter((r) => r.paths.length > 0).length})
              </summary>
              <ul className="mt-2 space-y-1">
                {related
                  .filter((r) => r.paths.length > 0)
                  .map((r) => (
                    <li key={r.id} className="text-zinc-500">
                      <span className="text-zinc-300">{r.title}</span>: {r.paths.slice(0, 3).join(", ")}
                      {r.paths.length > 3 && ` (+${r.paths.length - 3} další)`}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* ── Backlinks ───────────────────────────────────────────────── */}
      {inboundEntities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
            Odkazují sem ({inboundEntities.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inboundEntities.map((be) => (
              <a
                key={be.id}
                href={be.route}
                className="glass glass-hover rounded-lg p-4 transition-all duration-200"
              >
                <div className="font-medium text-sm text-zinc-200">{be.title}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mt-1">
                  {getEntityLabel(be.type)}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
