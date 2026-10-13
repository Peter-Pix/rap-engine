"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  COUNTRY_PATHS,
  MAP_VIEWBOX,
  projectToMap,
} from "@/lib/content/map-geometry";

export interface MapCity {
  id: string;
  slug: string;
  title: string;
  artistCount: number;
  lon: number;
  lat: number;
}

interface SceneMapProps {
  cities: MapCity[];
}

/** Poloměr bodu podle počtu interpretů (sqrt škála, ať Praha nezničí zbytek). */
function radiusFor(count: number): number {
  if (count <= 0) return 5;
  return Math.min(38, 6 + Math.sqrt(count) * 3.6);
}

/**
 * Interaktivní SVG mapa CZ/SK rapové scény.
 *
 * - Obrysy zemí z Natural Earth (viz map-geometry.ts).
 * - Body = města, odkud interpreti pocházejí; velikost dle počtu interpretů.
 * - Hover → tooltip s názvem a počtem; klik → profil lokality.
 * - Bez závislostí, bez externích dlaždic — celé je to ~5 KB SVG.
 */
export default function SceneMap({ cities }: SceneMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  // Projekce měst + seřazení (velké body první, malé navrch → malá města
  // nezmizí pod velkými).
  const points = useMemo(() => {
    return cities
      .map((c) => {
        const { x, y } = projectToMap(c.lon, c.lat);
        return { ...c, x, y, r: radiusFor(c.artistCount) };
      })
      .sort((a, b) => b.r - a.r);
  }, [cities]);

  const maxCount = Math.max(1, ...cities.map((c) => c.artistCount));
  const hoveredCity = points.find((p) => p.id === hovered) ?? null;

  // Labely ukazujeme pro největší města (top 12 podle počtu interpretů) —
  // jinak se v Praze/severu Čech názvy slévají. Menší města se ukážou při hoveru.
  const labeledIds = useMemo(
    () =>
      new Set(
        [...cities]
          .sort((a, b) => b.artistCount - a.artistCount)
          .slice(0, 12)
          .map((c) => c.id),
      ),
    [cities],
  );

  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/55">
          {cities.length} měst · {cities.reduce((s, c) => s + c.artistCount, 0)} vazeb
        </p>
        <button
          type="button"
          onClick={() => setShowLabels((v) => !v)}
          className="text-[11px] font-mono uppercase tracking-wider border border-white/10 rounded px-2 py-1 text-white/65 hover:text-white/80 hover:border-white/25 transition-colors"
        >
          {showLabels ? "Skrýt názvy" : "Zobrazit názvy"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Mapa české a slovenské rapové scény"
        >
          <defs>
            <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c8962e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c8962e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Obrysy zemí */}
          {Object.entries(COUNTRY_PATHS).map(([iso, d]) => (
            <path
              key={iso}
              d={d}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(200,150,46,0.35)"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Body měst */}
          {points.map((p) => {
            const isHovered = hovered === p.id;
            return (
              <g key={p.id}>
                {p.artistCount > 0 && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.r * 1.8}
                    fill="url(#cityGlow)"
                    pointerEvents="none"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={isHovered ? "#e8b455" : "#c8962e"}
                  fillOpacity={isHovered ? 1 : 0.85}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth={1.5}
                  className="cursor-pointer transition-all duration-200"
                  vectorEffect="non-scaling-stroke"
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* Neviditelný větší terč pro snadné najetí */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={Math.max(p.r, 14)}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                />
                {showLabels && (labeledIds.has(p.id) || isHovered) && (
                  <text
                    x={p.x + p.r + 5}
                    y={p.y + (p.id === "location_trnava" ? 26 : 5)}
                    fontSize={22}
                    fontWeight={600}
                    fontFamily="ui-monospace, monospace"
                    fill={isHovered ? "#fff" : "rgba(255,255,255,0.75)"}
                    stroke="rgba(0,0,0,0.85)"
                    strokeWidth={4}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {p.title}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredCity && (
          <div className="pointer-events-none absolute left-3 top-3 glass rounded-lg px-3 py-2 text-sm">
            <div className="font-semibold text-white">{hoveredCity.title}</div>
            <div className="text-white/50 text-xs font-mono">
              {hoveredCity.artistCount}{" "}
              {hoveredCity.artistCount === 1 ? "interpret" : "interpretů"}
            </div>
          </div>
        )}
      </div>

      {/* Pravý panel: legenda + seznam měst (využívá prázdný prostor) */}
      <div className="w-full">
        {/* Legenda */}
        <div className="glass rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/55 mb-3">
            Jak číst mapu
          </p>
          <ul className="space-y-2 text-xs text-white/75">
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-[#c8962e] shrink-0" />
              Velikost bodu = počet interpretů z daného města
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#c8962e]/70 shrink-0" />
              Nejvíce: {maxCount}× · nejméně: 1×
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#c8962e] shrink-0">↗</span>
              Klikni na bod nebo název → profil města
            </li>
          </ul>
        </div>

        {/* Všechna města */}
        <div className="mt-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/55 mb-3">
            Všechna města ({cities.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...cities]
              .sort((a, b) => b.artistCount - a.artistCount)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/lokality/${c.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-white/[0.1] text-white/85 hover:text-[#c8962e] hover:border-[#c8962e]/40 transition-colors"
                >
                  {c.title}
                  <span className="text-white/55 font-mono">{c.artistCount}</span>
                </Link>
              ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
