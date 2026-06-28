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

// ─── Camera / Viewport ──────────────────────────────────────────────────
interface Camera {
  x: number;
  y: number;
  zoom: number;
}

function worldToScreen(camera: Camera, wx: number, wy: number, cx: number, cy: number) {
  return {
    x: (wx - camera.x) * camera.zoom + cx,
    y: (wy - camera.y) * camera.zoom + cy,
  };
}

function screenToWorld(camera: Camera, sx: number, sy: number, cx: number, cy: number) {
  return {
    x: (sx - cx) / camera.zoom + camera.x,
    y: (sy - cy) / camera.zoom + camera.y,
  };
}

export function NetworkCanvas({ nodes, edges }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Mutable refs for drag/pan (don't trigger re-renders)
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const cameraStartRef = useRef<Camera | null>(null);
  const draggingNodeRef = useRef<string | null>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);

  // Store latest nodes/edges for draw loop
  const simNodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef(edges);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // ─── Get mouse position in canvas coords ────────────────────────────────
  const getMousePos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  // ─── Find node at screen position ──────────────────────────────────────
  const findNodeAt = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      return simNodesRef.current.find((n) => {
        const r = getNodeRadius(n) + 2;
        const pos = worldToScreen(camera, n.x ?? 0, n.y ?? 0, cx, cy);
        const dx = pos.x - sx;
        const dy = pos.y - sy;
        return dx * dx + dy * dy < r * r * camera.zoom * camera.zoom;
      });
    },
    [camera],
  );

  const getNodeRadius = useCallback((n: GraphNode) => {
    const maxD = Math.max(...simNodesRef.current.map((n) => n.degree), 1);
    const t = Math.log(n.degree) / Math.log(maxD);
    const containerW = containerRef.current?.clientWidth ?? 800;
    const maxR = containerW < 640 ? 18 : containerW < 1024 ? 24 : 32;
    return Math.min(6 + t * maxR, maxR);
  }, []);

  // ─── Init simulation ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const simNodes = nodes.map((n) => ({ ...n, x: 0, y: 0 }));
    simNodesRef.current = simNodes;

    const simLinks = edges.map((e) => ({
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
      .force("x", forceX(0).strength(0.08))
      .force("y", forceY(0).strength(0.08))
      .alphaDecay(0.02)
      .on("tick", () => {
        // Sim runs until alpha < 0.001, then stops for stable rendering
      });

    simRef.current = sim;

    // Center camera on bbox once layout settles
    const timer = setTimeout(() => {
      const xs = simNodes.map((n) => n.x ?? 0);
      const ys = simNodes.map((n) => n.y ?? 0);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      setCamera({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: 1 });
    }, 500);

    return () => {
      sim.stop();
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
  }, [nodes, edges, getNodeRadius]);

  // ─── Draw loop (separate from simulation) ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

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
        const a = simNodesRef.current.find((n) => n.id === e.from);
        const b = simNodesRef.current.find((n) => n.id === e.to);
        if (!a || !b) return;

        const posA = worldToScreen(camera, a.x ?? 0, a.y ?? 0, cx, cy);
        const posB = worldToScreen(camera, b.x ?? 0, b.y ?? 0, cx, cy);

        const highlighted =
          hovered === e.from || hovered === e.to || selected === e.from || selected === e.to;
        const dimmed = isDimmed(e.from) || isDimmed(e.to);

        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.lineTo(posB.x, posB.y);
        ctx.strokeStyle = highlighted ? "rgba(200,150,46,0.6)" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = highlighted ? 2 : 1;
        ctx.globalAlpha = dimmed ? 0.15 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Nodes
      simNodesRef.current.forEach((n) => {
        const isHovered = hovered === n.id;
        const r = getNodeRadius(n) * (isHovered ? 1.3 : 1);
        const dimmed = isDimmed(n.id);
        const highlighted = isHighlighted(n.id);
        const color = TYPE_COLORS[n.type as EntityType] ?? "#ccc";

        const pos = worldToScreen(camera, n.x ?? 0, n.y ?? 0, cx, cy);
        const screenR = r * camera.zoom;

        ctx.globalAlpha = dimmed ? 0.2 : 1;

        if (highlighted) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, screenR + 8 * camera.zoom, 0, Math.PI * 2);
          ctx.fillStyle = color + "30";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, screenR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = highlighted ? "#fff" : color + "80";
        ctx.lineWidth = highlighted ? 2 : 1;
        ctx.stroke();

        if (isHovered || highlighted || screenR > 14) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = `${isHovered || highlighted ? 700 : 400} ${Math.max(9, 11 * camera.zoom)}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(n.title, pos.x, pos.y + screenR + 14);
        }

        ctx.globalAlpha = 1;
      });

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [camera, hovered, selected, getNodeRadius]);

  // ─── Event handlers ─────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e.clientX, e.clientY);

      // Pan
      if (isPanningRef.current && panStartRef.current && cameraStartRef.current) {
        const dx = (pos.x - panStartRef.current.x) / camera.zoom;
        const dy = (pos.y - panStartRef.current.y) / camera.zoom;
        setCamera({
          x: cameraStartRef.current.x - dx,
          y: cameraStartRef.current.y - dy,
          zoom: cameraStartRef.current.zoom,
        });
        return;
      }

      // Drag node
      if (draggingNodeRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const cx = canvas.clientWidth / 2;
        const cy = canvas.clientHeight / 2;
        const worldPos = screenToWorld(camera, pos.x, pos.y, cx, cy);
        const n = simNodesRef.current.find((n) => n.id === draggingNodeRef.current);
        if (n) {
          n.x = worldPos.x;
          n.y = worldPos.y;
          n.vx = 0;
          n.vy = 0;
          // Re-heat simulation
          simRef.current?.alpha(0.3).restart();
        }
        return;
      }

      // Hover
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        setHovered(node.id);
        setHoveredPos({ x: e.clientX, y: e.clientY });
      } else {
        setHovered(null);
        setHoveredPos(null);
      }
    },
    [camera, getMousePos, findNodeAt],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e.clientX, e.clientY);
      const node = findNodeAt(pos.x, pos.y);

      if (node) {
        draggingNodeRef.current = node.id;
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: pos.x, y: pos.y };
        cameraStartRef.current = { ...camera };
      }
    },
    [camera, getMousePos, findNodeAt],
  );

  const handleMouseUp = useCallback(() => {
    draggingNodeRef.current = null;
    isPanningRef.current = false;
    panStartRef.current = null;
    cameraStartRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
    setHoveredPos(null);
    draggingNodeRef.current = null;
    isPanningRef.current = false;
    panStartRef.current = null;
    cameraStartRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const pos = getMousePos(e.clientX, e.clientY);

      const worldBefore = screenToWorld(camera, pos.x, pos.y, cx, cy);
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomFactor));

      const newCamera = { ...camera, zoom: newZoom };
      const worldAfter = screenToWorld(newCamera, pos.x, pos.y, cx, cy);

      setCamera({
        ...newCamera,
        x: newCamera.x + (worldBefore.x - worldAfter.x),
        y: newCamera.y + (worldBefore.y - worldAfter.y),
      });
    },
    [camera, getMousePos],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) return;
      const pos = getMousePos(e.clientX, e.clientY);
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
    ? simNodesRef.current.find((n) => n.id === selected)
    : null;

  const selectedEdges = selected
    ? edgesRef.current.filter((e) => e.from === selected || e.to === selected)
    : [];

  return (
    <div className="relative w-full flex-1 min-h-0" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(5, c.zoom * 1.3) }))}
          className="w-8 h-8 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-white/[0.08] text-white/70 hover:text-white flex items-center justify-center text-lg"
          title="Přiblížit"
        >
          +
        </button>
        <button
          onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(0.1, c.zoom / 1.3) }))}
          className="w-8 h-8 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-white/[0.08] text-white/70 hover:text-white flex items-center justify-center text-lg"
          title="Oddálit"
        >
          −
        </button>
        <button
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
          className="w-8 h-8 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-white/[0.08] text-white/70 hover:text-white flex items-center justify-center text-xs"
          title="Reset pohledu"
        >
          ⌂
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-white/[0.08] max-w-[140px] sm:max-w-none">
        <h3 className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 sm:mb-2">
          Typ entity
        </h3>
        <div className="space-y-1 sm:space-y-1.5">
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
        <p className="text-[9px] sm:text-[10px] text-white/30 mt-2 sm:mt-3 leading-relaxed">
          Klikni → detaily
          <br className="hidden sm:block" />
          <span className="sm:hidden"> · </span>Drag → posun
          <br className="hidden sm:block" />
          <span className="sm:hidden"> · </span>Scroll → zoom
        </p>
      </div>

      {/* Selected panel */}
      {selectedNode && (
        <div className="absolute bottom-2 left-2 right-2 sm:top-4 sm:right-4 sm:left-auto sm:bottom-auto sm:w-64 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/[0.08] max-h-[40vh] sm:max-h-none overflow-y-auto">
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
              const other = simNodesRef.current.find((n) => n.id === otherId);
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
        const node = simNodesRef.current.find((n) => n.id === hovered);
        if (!node) return null;
        const relatedCount = edgesRef.current.filter(
          (e) => e.from === hovered || e.to === hovered
        ).length;
        const tooltipW = 200;
        const tooltipH = 60;
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        let left = hoveredPos.x + 12;
        let top = hoveredPos.y - tooltipH / 2;
        if (left + tooltipW > winW) left = hoveredPos.x - tooltipW - 12;
        if (top < 0) top = 8;
        if (top + tooltipH > winH) top = winH - tooltipH - 8;
        return (
          <div
            className="fixed pointer-events-none z-50 bg-zinc-900/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border border-white/[0.12] shadow-xl"
            style={{
              left: Math.max(8, left),
              top: Math.max(8, top),
              maxWidth: 'min(200px, 90vw)',
            }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: TYPE_COLORS[node.type as EntityType] ?? "#ccc" }}
              />
              <span className="text-xs sm:text-sm font-bold text-white truncate">{node.title}</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-white/50 mt-0.5 sm:mt-1">
              {node.type === "artist" ? "Interpret" : node.type === "album" ? "Album" : node.type === "label" ? "Label" : node.type === "location" ? "Město" : node.type} · {relatedCount} vazeb
            </p>
          </div>
        );
      })()}
    </div>
  );
}
