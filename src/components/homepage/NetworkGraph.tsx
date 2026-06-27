import Link from "next/link";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { getArtistImage } from "@/lib/content/images";

// ─── Types ────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  slug: string;
  title: string;
  image?: string;
  degree: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string; // index into nodes[]
  target: string;
}

export interface GraphLayout {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface NetworkGraphProps {
  layout: GraphLayout;
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Server-rendered SVG network graph of the most-connected artists.
 *
 * Each node is clickable and links to the artist profile.
 * Node radius scales with degree (log scale).
 * Edge opacity is uniform — graph is small enough to read at a glance.
 */
export function NetworkGraph({ layout }: NetworkGraphProps) {
  const { width, height, nodes, edges } = layout;

  // Max degree for radius scaling (log scale: top artist doesn't dwarf smaller ones)
  const maxDegree = Math.max(...nodes.map((n) => n.degree), 1);
  const minR = 18;
  const maxR = 30;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Síť nejvíc propojených interpretů českého a slovenského rapu"
      >
        <defs>
          <radialGradient id="nodeHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c8962e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#c8962e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Edges first so they sit behind nodes */}
        <g stroke="rgba(200,150,46,0.25)" strokeWidth="1" fill="none">
          {edges.map((e, i) => {
            const a = nodes[Number(e.source)];
            const b = nodes[Number(e.target)];
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((n) => {
            const t = Math.log(n.degree) / Math.log(maxDegree);
            const r = minR + (maxR - minR) * t;
            const localImg = getArtistImage(n.slug);
            const imgUrl = localImg ?? n.image;
            const route = `${TYPE_ROUTE_MAP.artist}/${n.slug}`;

            return (
              <Link key={n.id} href={route} aria-label={`${n.title} — ${n.degree} propojení`}>
                <g className="cursor-pointer transition-transform hover:scale-110 origin-center">
                  {/* Soft halo */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r + 8}
                    fill="url(#nodeHalo)"
                  />
                  {/* Image or initial */}
                  {imgUrl ? (
                    <g>
                      <defs>
                        <clipPath id={`clip-${n.id}`}>
                          <circle cx={n.x} cy={n.y} r={r} />
                        </clipPath>
                      </defs>
                      <image
                        href={imgUrl}
                        x={n.x - r}
                        y={n.y - r}
                        width={r * 2}
                        height={r * 2}
                        clipPath={`url(#clip-${n.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>
                  ) : (
                    <text
                      x={n.x}
                      y={n.y + 4}
                      textAnchor="middle"
                      fontSize={r * 0.55}
                      fontWeight="700"
                      fill="#c8962e"
                      className="pointer-events-none select-none"
                    >
                      {n.title[0]}
                    </text>
                  )}
                  {/* Border */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill="none"
                    stroke="#c8962e"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                  {/* Label */}
                  <text
                    x={n.x}
                    y={n.y + r + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="rgba(255,255,255,0.85)"
                    className="pointer-events-none select-none"
                  >
                    {n.title}
                  </text>
                  {/* Degree badge */}
                  <text
                    x={n.x}
                    y={n.y + r + 28}
                    textAnchor="middle"
                    fontSize="8"
                    fontFamily="monospace"
                    fill="rgba(255,255,255,0.4)"
                    className="pointer-events-none select-none"
                  >
                    {n.degree} vazeb
                  </text>
                </g>
              </Link>
            );
          })}
        </g>

      </svg>
    </div>
  );
}
