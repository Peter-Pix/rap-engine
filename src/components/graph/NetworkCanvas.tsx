"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceX,
  forceY,
  forceCollide,
} from "d3-force";
import Link from "next/link";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

interface GraphNode {
  id: string;
  type: string;
  slug: string;
  title: string;
  image?: string | null;
  degree: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

interface NetworkCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const TYPE_COLORS: Record<EntityType, string> = {
  artist: "#c8962e",
  album: "#4ecdc4",
  track: "#95e1d3",
  genre: "#a8e6cf",
  style: "#a8e6cf",
  theme: "#a8e6cf",
  mood: "#a8e6cf",
  scene: "#a8e6cf",
  label: "#ff6b6b",
  location: "#f38181",
  article: "#ccc",
  collective: "#c8962e",
  producer: "#c8962e",
  event: "#ccc",
};

export function NetworkCanvas({ nodes, edges }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const simRef = useRef<
    ReturnType<typeof forceSimulation<GraphNode>> | null
  >(null);

  const nodesRef = useRef<GraphNode[]>(nodes);
  const edgesRef = useRef<GraphEdge[]>(edges);
  const hoveredRef = useRef<string | null>(hovered);
  const hoveredPosRef = useRef<{ x: number; y: number } | null>(hoveredPos);
  const selectedRef = useRef<string | null>(selected);
  const draggingRef = useRef<string | null>(dragging);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);
  useEffect(() => {
    hoveredPosRef.current = hoveredPos;
  }, [hoveredPos]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  const getNodeRadius = useCallback((n: GraphNode) => {
    const maxD = Math.max(...nodesRef.current.map((n) => n.degree), 1);
    const t = Math.log(n.degree) / Math.log(maxD);
    return 8 + t * 24; // 8–32px
  }, []);

  const getMousePos = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    },
    [],
  );

  const findNodeAt = useCallback(
    (x: number, y: number) => {
      return nodesRef.current.find((n) => {
        const r = getNodeRadius(n) + 2;
        const dx = (n.x ?? 0) - x;
        const dy = (n.y ?? 0) - y;
        return dx * dx + dy * dy < r * r;
      });
    },
    [getNodeRadius],
  );

  // Init simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = Math.max(window.innerHeight - 200, 500);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d")!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const simNodes = nodesRef.current.map((n) => ({ ...n, x: w / 2, y: h / 2 }));
    const simLinks = edgesRef.current.map((e) => ({
      source: e.from,
      target: e.to,
      relation: e.relation,
    }));

    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(80)
          .strength(0.6),
      )
      .force("charge", forceManyBody().strength(-200))
      .force("collide", forceCollide().radius((d: any) => getNodeRadius(d) + 5))
      .force("x", forceX(w / 2).strength(0.08))
      .force("y", forceY(h / 2).strength(0.08))
      .alphaDecay(0.02)
      .on("tick", () => {
        // Keep within bounds
        simNodes.forEach((n) => {
          const r = getNodeRadius(n);
          n.x = Math.max(r, Math.min(w - r, n.x ?? 0));
          n.y = Math.max(r, Math.min(h - r, n.y ?? 0));
        });
        draw();
      });

    simRef.current = sim;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const hovered = hoveredRef.current;
      const selected = selectedRef.current;
      const isHighlighted = (id: string) =>
        hovered === id || selected === id ||
        (hovered && edgesRef.current.some((e) =>
          (e.from === hovered && e.to === id) || (e.to === hovered && e.from === id)
        )) ||
        (selected && edgesRef.current.some((e) =>
          (e.from === selected && e.to === id) || (e.to === selected && e.from === id)
        ));
      const isDimmed = (id: string) =>
        (hovered || selected) && !isHighlighted(id) && id !== hovered && id !== selected;

      // Edges
      edgesRef.current.forEach((e) => {
        const a = simNodes.find((n) => n.id === e.from);
        const b = simNodes.find((n) => n.id === e.to);
        if (!a || !b) return;

        const highlighted =
          hovered === e.from || hovered === e.to || selected === e.from || selected === e.to;
        const dimmed = isDimmed(e.from) || isDimmed(e.to);

        ctx.beginPath();
        ctx.moveTo(a.x ?? 0, a.y ?? 0);
        ctx.lineTo(b.x ?? 0, b.y ?? 0);
        ctx.strokeStyle = highlighted ? "rgba(200,150,46,0.5)" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = highlighted ? 2 : 1;
        ctx.globalAlpha = dimmed ? 0.15 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Nodes
      simNodes.forEach((n) => {
        const isHovered = hoveredRef.current === n.id;
        const r = getNodeRadius(n) * (isHovered ? 1.3 : 1);
        const dimmed = isDimmed(n.id);
        const highlighted = isHighlighted(n.id);
        const color = TYPE_COLORS[n.type as EntityType] ?? "#ccc";

        ctx.globalAlpha = dimmed ? 0.2 : 1;

        // Glow
        if (highlighted) {
          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, r + 8, 0, Math.PI * 2);
          ctx.fillStyle = color + "30";
          ctx.fill();
        }

        // Circle
        ctx.beginPath();
        ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = highlighted ? "#fff" : color + "80";
        ctx.lineWidth = highlighted ? 2 : 1;
        ctx.stroke();

        // Label (for large, highlighted, or hovered nodes)
        if (isHovered || highlighted || r > 20) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = `${isHovered || highlighted ? 700 : 400} 12px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(n.title, n.x ?? 0, (n.y ?? 0) + r + 16);
        }

        ctx.globalAlpha = 1;
      });
    };

    return () => {
      sim.stop();
      window.removeEventListener("resize", resize);
    };
  }, [getNodeRadius]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        setHovered(node.id);
        setHoveredPos({ x: e.clientX, y: e.clientY });
      } else {
        setHovered(null);
        setHoveredPos(null);
      }

      if (draggingRef.current) {
        const sim = simRef.current;
        if (sim) {
          const n = sim.nodes().find((n: any) => n.id === draggingRef.current);
          if (n) {
            (n as any).fx = pos.x;
            (n as any).fy = pos.y;
          }
        }
      }
    },
    [getMousePos, findNodeAt],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        setDragging(node.id);
        const sim = simRef.current;
        if (sim) {
          const n = sim.nodes().find((n: any) => n.id === node.id);
          if (n) {
            (n as any).fx = pos.x;
            (n as any).fy = pos.y;
          }
        }
      }
    },
    [getMousePos, findNodeAt],
  );

  const handleMouseUp = useCallback(() => {
    if (draggingRef.current) {
      const sim = simRef.current;
      if (sim) {
        const n = sim.nodes().find((n: any) => n.id === draggingRef.current);
        if (n) {
          (n as any).fx = null;
          (n as any).fy = null;
        }
      }
      setDragging(null);
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e);
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        setSelected((prev) => (prev === node.id ? null : node.id));
      } else {
        setSelected(null);
      }
    },
    [getMousePos, findNodeAt],
  );

  const selectedNode = selected
    ? nodesRef.current.find((n) => n.id === selected)
    : null;

  const selectedEdges = selected
    ? edgesRef.current.filter((e) => e.from === selected || e.to === selected)
    : [];

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-3 border border-white/[0.08]">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-white/50 mb-2">
          Typ entity
        </h3>
        <div className="space-y-1.5">
          {Object.entries(TYPE_COLORS)
            .filter(([type]) => ["artist", "album", "label", "location"].includes(type))
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-white/70 capitalize">
                  {type === "artist" ? "Interpret" : type === "album" ? "Album" : type === "label" ? "Label" : "Město"}
                </span>
              </div>
            ))}
        </div>
        <p className="text-[10px] text-white/30 mt-3 leading-relaxed">
          Klikni na node → detaily
          <br />
          Drag → posun
          <br />
          Hover → zvýraznění
        </p>
      </div>

      {/* Selected panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-64 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-4 border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[selectedNode.type as EntityType] ?? "#ccc" }}
            />
            <h2 className="text-sm font-bold text-white">
              {selectedNode.title}
            </h2>
          </div>

          <p className="text-[10px] font-mono text-white/40 mb-3">
            {selectedNode.degree} vazeb · {selectedNode.type}
          </p>

          <Link
            href={`${TYPE_ROUTE_MAP[selectedNode.type as EntityType] ?? `/${selectedNode.type}`}/${selectedNode.slug}`}
            className="block text-[11px] text-[#c8962e] hover:underline mb-4"
          >
            Zobrazit detail →
          </Link>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1">
              Propojení
            </h3>
            {selectedEdges.map((e) => {
              const isFrom = e.from === selectedNode.id;
              const otherId = isFrom ? e.to : e.from;
              const other = nodesRef.current.find((n) => n.id === otherId);
              if (!other) return null;
              return (
                <div key={e.from + e.to} className="flex items-center gap-1.5 text-[11px]">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[other.type as EntityType] ?? "#ccc" }}
                  />
                  <span className="text-white/70">{other.title}</span>
                  <span className="text-white/30 text-[9px]">({e.relation})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && hoveredPos && (() => {
        const node = nodesRef.current.find((n) => n.id === hovered);
        if (!node) return null;
        const relatedCount = edgesRef.current.filter(
          (e) => e.from === hovered || e.to === hovered
        ).length;
        return (
          <div
            className="fixed pointer-events-none z-50 bg-zinc-900/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/[0.12] shadow-xl"
            style={{
              left: hoveredPos.x + 16,
              top: hoveredPos.y - 10,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[node.type as EntityType] ?? "#ccc" }}
              />
              <span className="text-sm font-bold text-white">{node.title}</span>
            </div>
            <p className="text-[10px] text-white/50 mt-1">
              {node.type === "artist" ? "Interpret" : node.type === "album" ? "Album" : node.type === "label" ? "Label" : node.type === "location" ? "Město" : node.type} · {relatedCount} vazeb
            </p>
          </div>
        );
      })()}
    </div>
  );
}
