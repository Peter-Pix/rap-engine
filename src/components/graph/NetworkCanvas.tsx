"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, memo } from "react";
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
import { getArtistImage } from "@/lib/content/images";

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

// ─── Outer wrapper with error boundary ──────────────────────────────────
function NetworkCanvas({ nodes, edges }: NetworkCanvasProps) {
  return (
    <NetworkErrorBoundary>
      <NetworkCanvasInner nodes={nodes} edges={edges} />
    </NetworkErrorBoundary>
  );
}

// React error boundary — catches render-time errors from the canvas/force-simulation
// and shows a graceful fallback. The previous try/catch wrapper was a React anti-pattern:
// it caught sync render errors but also called setState during render, plus it could not
// catch async useEffect errors at all, which made the graph flash and disappear.
class NetworkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[NetworkCanvas] render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full text-white/50 p-6 text-center">
          <div>
            <p className="text-sm mb-1">Chyba při vykreslování grafu</p>
            <p className="text-xs text-white/40 font-mono">{this.state.error}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

// Node radius based on degree, with sane fallback when no nodes loaded yet.
function nodeRadius(
  node: GraphNode,
  maxDegree: number,
  containerWidth: number,
): number {
  if (!maxDegree || maxDegree <= 0) return 8;
  const t = Math.log(node.degree + 1) / Math.log(maxDegree + 1);
  const maxR = containerWidth < 640 ? 18 : containerWidth < 1024 ? 24 : 32;
  return Math.min(6 + t * maxR, maxR);
}

// ─── Main inner component ───────────────────────────────────────────────
function NetworkCanvasInner({ nodes, edges }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera — useState for re-render trigger when controls are clicked,
  // but every consumer inside RAF / event handlers reads from cameraRef
  // so the closure is always fresh.
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef<Camera>(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Mutable refs for drag/pan (don't trigger re-renders)
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const cameraStartRef = useRef<Camera | null>(null);
  const draggingNodeRef = useRef<string | null>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);

  // Sim + lookup data — single source of truth for the draw loop
  const simNodesRef = useRef<GraphNode[]>([]);
  const nodeIdMapRef = useRef<Map<string, GraphNode>>(new Map());
  const maxDegreeRef = useRef<number>(1);
  const containerSizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 600 });
  const edgesRef = useRef(edges);

  // Image cache
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  // Track which nodes have started loading — avoids duplicate loads on re-mount
  const imageLoadStartedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // ─── Mouse position helper (CSS coords, not DPR-scaled) ───────────────
  const getMousePos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // ─── Find node at screen position (O(N) via id map) ────────────────────
  const findNodeAt = useCallback((sx: number, sy: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const cam = cameraRef.current;
    const camZoomSq = cam.zoom * cam.zoom;
    const maxDeg = maxDegreeRef.current;
    const containerW = containerSizeRef.current.w;
    const nodes = simNodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const r = nodeRadius(n, maxDeg, containerW) + 2;
      const pos = worldToScreen(cam, n.x ?? 0, n.y ?? 0, cx, cy);
      const dx = pos.x - sx;
      const dy = pos.y - sy;
      if (dx * dx + dy * dy < r * r * camZoomSq) {
        return n;
      }
    }
    return null;
  }, []);

  // ─── Resize handling — keep canvas + container size in sync ────────────
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      containerSizeRef.current = { w, h };
    };

    resize();

    // Deferred resize — catches layout settling on mobile (after fonts/images load)
    const deferredTimer = setTimeout(resize, 100);
    const deferredTimer2 = setTimeout(resize, 400);

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      clearTimeout(deferredTimer);
      clearTimeout(deferredTimer2);
    };
  }, []);

  // ─── Native touch events (non-passive, read camera from ref) ──────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const pos = getMousePos(touch.clientX, touch.clientY);
        const node = findNodeAt(pos.x, pos.y);

        if (node) {
          draggingNodeRef.current = node.id;
        } else {
          isPanningRef.current = true;
          panStartRef.current = { x: pos.x, y: pos.y };
          cameraStartRef.current = { ...cameraRef.current };
        }
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        (panStartRef.current as any) = { dist, zoom: cameraRef.current.zoom };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const pos = getMousePos(touch.clientX, touch.clientY);
        const cam = cameraRef.current;

        if (isPanningRef.current && panStartRef.current && cameraStartRef.current) {
          const dx = (pos.x - panStartRef.current.x) / cam.zoom;
          const dy = (pos.y - panStartRef.current.y) / cam.zoom;
          const next = {
            x: cameraStartRef.current.x - dx,
            y: cameraStartRef.current.y - dy,
            zoom: cameraStartRef.current.zoom,
          };
          cameraRef.current = next;
          setCamera(next);
        }

        if (draggingNodeRef.current) {
          const c = canvasRef.current;
          if (!c) return;
          const cx = c.clientWidth / 2;
          const cy = c.clientHeight / 2;
          const worldPos = screenToWorld(cam, pos.x, pos.y, cx, cy);
          const n = nodeIdMapRef.current.get(draggingNodeRef.current);
          if (n) {
            n.x = worldPos.x;
            n.y = worldPos.y;
            n.vx = 0;
            n.vy = 0;
            simRef.current?.alpha(0.3).restart();
          }
        }
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const start = panStartRef.current as any;
        if (start?.dist) {
          const scale = dist / start.dist;
          const newZoom = Math.max(0.1, Math.min(5, start.zoom * scale));
          const next = { ...cameraRef.current, zoom: newZoom };
          cameraRef.current = next;
          setCamera(next);
        }
      }
    };

    const onTouchEnd = () => {
      draggingNodeRef.current = null;
      isPanningRef.current = false;
      panStartRef.current = null;
      cameraStartRef.current = null;
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [getMousePos, findNodeAt]); // camera NOT in deps — we always read from cameraRef

  // ─── Init simulation ────────────────────────────────────────────────────
  useEffect(() => {
    if (nodes.length === 0) {
      simNodesRef.current = [];
      nodeIdMapRef.current = new Map();
      maxDegreeRef.current = 1;
      return;
    }

    const simNodes = nodes.map((n) => ({ ...n, x: 0, y: 0 }));
    simNodesRef.current = simNodes;

    // Build O(1) id → node map
    const idMap = new Map<string, GraphNode>();
    let maxDeg = 0;
    for (let i = 0; i < simNodes.length; i++) {
      const n = simNodes[i];
      idMap.set(n.id, n);
      if (n.degree > maxDeg) maxDeg = n.degree;
    }
    nodeIdMapRef.current = idMap;
    maxDegreeRef.current = maxDeg;

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
          .strength(0.5),
      )
      .force("charge", forceManyBody().strength(-300))
      .force("collide", forceCollide().radius((d: any) => {
        // Use a stable estimate (no closure over latest refs)
        const maxD = maxDegreeRef.current || 1;
        const containerW = containerSizeRef.current.w;
        return nodeRadius(d, maxD, containerW) + 4;
      }))
      .force("x", forceX(0).strength(0.05))
      .force("y", forceY(0).strength(0.05))
      .alphaDecay(0.02)
      .alphaMin(0.005)
      .alpha(1);

    simRef.current = sim;

    // Fit camera to viewport once simulation has settled a bit.
    // Use a polling approach (a few times) because sim may not be stable after one tick.
    let pollTicks = 0;
    const maxPolls = 12;
    const fitInterval = setInterval(() => {
      pollTicks++;
      const cur = simNodesRef.current;
      if (cur.length === 0) {
        clearInterval(fitInterval);
        return;
      }
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < cur.length; i++) {
        const n = cur[i];
        if (n.x === undefined || n.y === undefined) continue;
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
      if (!isFinite(minX) || !isFinite(minY)) {
        if (pollTicks >= maxPolls) clearInterval(fitInterval);
        return;
      }
      const simW = Math.max(1, maxX - minX);
      const simH = Math.max(1, maxY - minY);
      const { w: cW, h: cH } = containerSizeRef.current;
      const padding = 80;
      const zoomX = (cW - padding) / simW;
      const zoomY = (cH - padding) / simH;
      const zoom = Math.max(0.05, Math.min(2, Math.min(zoomX, zoomY)));
      const center = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        zoom,
      };
      cameraRef.current = center;
      setCamera(center);
      // Stop once sim has cooled down (alpha is small) OR we hit max polls
      const alpha = (simRef.current as any)?.alpha?.();
      if ((typeof alpha === "number" && alpha < 0.05) || pollTicks >= maxPolls) {
        clearInterval(fitInterval);
      }
    }, 200);

    return () => {
      sim.stop();
      clearInterval(fitInterval);
    };
  }, [nodes, edges]);

  // ─── Image loading (no setState — never triggers re-render) ───────────
  useEffect(() => {
    const cache = imageCacheRef.current;
    const started = imageLoadStartedRef.current;
    const artistNodes = nodes.filter((n) => n.type === "artist");
    for (const n of artistNodes) {
      if (started.has(n.id)) continue;
      const imgUrl = getArtistImage(n.slug) ?? n.image ?? null;
      if (!imgUrl) {
        started.add(n.id);
        continue;
      }
      if (cache.has(n.id)) {
        started.add(n.id);
        continue;
      }
      started.add(n.id);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        cache.set(n.id, img);
      };
      img.onerror = () => {
        // silently skip — fallback circle will be used
      };
      img.src = imgUrl;
    }
  }, [nodes]);

  // ─── Draw loop (always reads from refs — never stale) ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let frameCount = 0;

    const draw = () => {
      frameCount++;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Fail-safe: never operate on a 0-size canvas
      if (w === 0 || h === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      const cx = w / 2;
      const cy = h / 2;
      const cam = cameraRef.current;
      const nodes = simNodesRef.current;
      const maxDeg = maxDegreeRef.current;
      const containerW = containerSizeRef.current.w;

      ctx.clearRect(0, 0, w, h);

      // Fail-safe: if sim hasn't produced any positions yet, just clear and wait
      if (nodes.length === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      const isHighlighted = (id: string) => {
        if (hovered === id || selected === id) return true;
        if (hovered) {
          const edges = edgesRef.current;
          for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            if ((e.from === hovered && e.to === id) || (e.to === hovered && e.from === id)) {
              return true;
            }
          }
        }
        if (selected) {
          const edges = edgesRef.current;
          for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            if ((e.from === selected && e.to === id) || (e.to === selected && e.from === id)) {
              return true;
            }
          }
        }
        return false;
      };
      const isDimmed = (id: string) => {
        if (!hovered && !selected) return false;
        if (id === hovered || id === selected) return false;
        return !isHighlighted(id);
      };

      // Edges
      const edges = edgesRef.current;
      const idMap = nodeIdMapRef.current;
      ctx.lineWidth = 1;
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const a = idMap.get(e.from);
        const b = idMap.get(e.to);
        if (!a || !b) continue;
        if (a.x === undefined || b.x === undefined) continue;

        const posA = worldToScreen(cam, a.x, a.y ?? 0, cx, cy);
        const posB = worldToScreen(cam, b.x ?? 0, b.y ?? 0, cx, cy);

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
      }
      ctx.globalAlpha = 1;

      // Nodes
      const imageCache = imageCacheRef.current;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.x === undefined || n.y === undefined) continue;
        const isHovered = hovered === n.id;
        const baseR = nodeRadius(n, maxDeg, containerW);
        const r = baseR * (isHovered ? 1.3 : 1);
        const dimmed = isDimmed(n.id);
        const highlighted = isHighlighted(n.id);
        const color = TYPE_COLORS[n.type as EntityType] ?? "#ccc";

        const pos = worldToScreen(cam, n.x, n.y, cx, cy);
        const screenR = r * cam.zoom;

        // Off-screen cull — skip drawing nodes outside the canvas
        if (pos.x + screenR < 0 || pos.x - screenR > w || pos.y + screenR < 0 || pos.y - screenR > h) {
          continue;
        }

        ctx.globalAlpha = dimmed ? 0.2 : 1;

        const img = imageCache.get(n.id);
        if (img && screenR > 4) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, screenR, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, pos.x - screenR, pos.y - screenR, screenR * 2, screenR * 2);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, screenR, 0, Math.PI * 2);
          ctx.strokeStyle = highlighted ? "#fff" : color + "80";
          ctx.lineWidth = highlighted ? 2.5 : 1.5;
          ctx.stroke();
        } else {
          if (highlighted) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, screenR + 8 * cam.zoom, 0, Math.PI * 2);
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

          if (n.type === "artist" && screenR > 8) {
            ctx.fillStyle = "#fff";
            ctx.font = `bold ${Math.max(8, screenR * 0.5)}px system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(n.title[0]?.toUpperCase() ?? "?", pos.x, pos.y + 1);
          }
        }

        // Labels — show for hovered, selected, or large nodes
        if (isHovered || highlighted || screenR > 12) {
          const labelY = pos.y + screenR + 14;
          const fontSize = Math.max(9, Math.min(12, 10 * cam.zoom));

          ctx.fillStyle = isHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)";
          ctx.font = `${isHovered ? 700 : 500} ${fontSize}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(n.title, pos.x, labelY);

          if (isHovered) {
            ctx.fillStyle = "rgba(255,255,255,0.45)";
            ctx.font = `${Math.max(8, fontSize - 1)}px monospace`;
            const typeLabel = n.type === "artist" ? "Interpret" : n.type === "album" ? "Album" : n.type === "label" ? "Label" : n.type === "location" ? "Město" : n.type;
            ctx.fillText(`${typeLabel} · ${n.degree} vazeb`, pos.x, labelY + fontSize + 2);
          }
        }

        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      void frameCount;
    };
  }, [hovered, selected]); // re-runs on hover/select for highlight updates

  // ─── Mouse / click / wheel handlers ────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e.clientX, e.clientY);
      const cam = cameraRef.current;

      if (isPanningRef.current && panStartRef.current && cameraStartRef.current) {
        const dx = (pos.x - panStartRef.current.x) / cam.zoom;
        const dy = (pos.y - panStartRef.current.y) / cam.zoom;
        const next = {
          x: cameraStartRef.current.x - dx,
          y: cameraStartRef.current.y - dy,
          zoom: cameraStartRef.current.zoom,
        };
        cameraRef.current = next;
        setCamera(next);
        return;
      }

      if (draggingNodeRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const cx = canvas.clientWidth / 2;
        const cy = canvas.clientHeight / 2;
        const worldPos = screenToWorld(cam, pos.x, pos.y, cx, cy);
        const n = nodeIdMapRef.current.get(draggingNodeRef.current);
        if (n) {
          n.x = worldPos.x;
          n.y = worldPos.y;
          n.vx = 0;
          n.vy = 0;
          simRef.current?.alpha(0.3).restart();
        }
        return;
      }

      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        setHovered(node.id);
        setHoveredPos({ x: e.clientX, y: e.clientY });
      } else {
        setHovered(null);
        setHoveredPos(null);
      }
    },
    [getMousePos, findNodeAt],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e.clientX, e.clientY);
      const node = findNodeAt(pos.x, pos.y);
      const cam = cameraRef.current;
      if (node) {
        draggingNodeRef.current = node.id;
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: pos.x, y: pos.y };
        cameraStartRef.current = { ...cam };
      }
    },
    [getMousePos, findNodeAt],
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
      const cam = cameraRef.current;

      const worldBefore = screenToWorld(cam, pos.x, pos.y, cx, cy);
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, cam.zoom * zoomFactor));

      const newCamera = { ...cam, zoom: newZoom };
      const worldAfter = screenToWorld(newCamera, pos.x, pos.y, cx, cy);

      const next = {
        ...newCamera,
        x: newCamera.x + (worldBefore.x - worldAfter.x),
        y: newCamera.y + (worldBefore.y - worldAfter.y),
      };
      cameraRef.current = next;
      setCamera(next);
    },
    [getMousePos],
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

  // ─── Read from refs for selected panel (no re-render dependency) ──────
  const selectedNode = selected ? nodeIdMapRef.current.get(selected) ?? null : null;
  const selectedEdges = selected
    ? edgesRef.current.filter((e) => e.from === selected || e.to === selected)
    : [];

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair touch-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Controls */}
      <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom)+0.5rem)] right-3 flex flex-col gap-1">
        <button
          onClick={() => {
            const next = { ...cameraRef.current, zoom: Math.min(5, cameraRef.current.zoom * 1.3) };
            cameraRef.current = next;
            setCamera(next);
          }}
          className="w-8 h-8 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-white/[0.08] text-white/70 hover:text-white flex items-center justify-center text-lg"
          title="Přiblížit"
        >
          +
        </button>
        <button
          onClick={() => {
            const next = { ...cameraRef.current, zoom: Math.max(0.1, cameraRef.current.zoom / 1.3) };
            cameraRef.current = next;
            setCamera(next);
          }}
          className="w-8 h-8 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-white/[0.08] text-white/70 hover:text-white flex items-center justify-center text-lg"
          title="Oddálit"
        >
          −
        </button>
        <button
          onClick={() => {
            const next = { x: 0, y: 0, zoom: 1 };
            cameraRef.current = next;
            setCamera(next);
          }}
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
              const other = nodeIdMapRef.current.get(otherId);
              if (!other) return null;
              return (
                <div key={e.from + e.to + e.relation} className="flex items-center gap-1.5 text-[11px]">
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
        const node = nodeIdMapRef.current.get(hovered);
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

export default memo(NetworkCanvas, (prev, next) => {
  // Identity compare — prevents re-render when parent passes same refs
  return prev.nodes === next.nodes && prev.edges === next.edges;
});
