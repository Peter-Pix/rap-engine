"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { getArtistImage } from "@/lib/content/images";

interface MiniNode {
  id: string;
  slug: string;
  title: string;
  x: number;
  y: number;
  degree: number;
  image?: string | null;
}

interface MiniEdge {
  source: string;
  target: string;
}

interface NetworkCanvasMiniProps {
  nodes: MiniNode[];
  edges: MiniEdge[];
  width: number;
  height: number;
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

export function NetworkCanvasMini({ nodes, edges, width, height }: NetworkCanvasMiniProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [camera, setCamera] = useState<Camera>({ x: width / 2, y: height / 2, zoom: 1 });
  const [hovered, setHovered] = useState<string | null>(null);

  // Image cache
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(0);

  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const cameraStartRef = useRef<Camera | null>(null);

  // Load images
  useEffect(() => {
    const cache = imageCacheRef.current;
    let loaded = 0;
    const total = nodes.length;

    nodes.forEach((n) => {
      const imgUrl = getArtistImage(n.slug) ?? n.image ?? null;
      if (!imgUrl) return;
      if (cache.has(n.id)) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        cache.set(n.id, img);
        loaded++;
        if (loaded >= total) setImagesLoaded((v) => v + 1);
      };
      img.onerror = () => {
        loaded++;
      };
      img.src = imgUrl;
    });
  }, [nodes]);

  // Fit camera to bbox on mount
  useEffect(() => {
    if (nodes.length === 0) return;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const bboxW = maxX - minX || 1;
    const bboxH = maxY - minY || 1;

    const container = containerRef.current;
    const cw = container?.clientWidth ?? width;
    const ch = container?.clientHeight ?? height;

    const padding = 50;
    const scaleX = (cw - padding * 2) / bboxW;
    const scaleY = (ch - padding * 2) / bboxH;
    const zoom = Math.min(scaleX, scaleY, 1.2);

    setCamera({
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom,
    });
  }, [nodes, width, height]);

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Draw loop
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

      const maxDegree = Math.max(...nodes.map((n) => n.degree), 1);
      const getR = (n: MiniNode) => {
        const t = Math.log(n.degree) / Math.log(maxDegree);
        return 6 + t * 14; // 6px to 20px
      };

      // Edges
      edges.forEach((e) => {
        const a = nodes[Number(e.source)];
        const b = nodes[Number(e.target)];
        if (!a || !b) return;

        const posA = worldToScreen(camera, a.x, a.y, cx, cy);
        const posB = worldToScreen(camera, b.x, b.y, cx, cy);

        const highlighted = hovered === a.id || hovered === b.id;

        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.lineTo(posB.x, posB.y);
        ctx.strokeStyle = highlighted ? "rgba(200,150,46,0.6)" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = highlighted ? 1.5 : 0.8;
        ctx.stroke();
      });

      // Nodes
      nodes.forEach((n) => {
        const isHovered = hovered === n.id;
        const baseR = getR(n);
        const r = baseR * (isHovered ? 1.3 : 1);
        const pos = worldToScreen(camera, n.x, n.y, cx, cy);
        const screenR = r * camera.zoom;

        const img = imageCacheRef.current.get(n.id);

        if (img && screenR > 4) {
          // Draw image clipped to circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, screenR, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, pos.x - screenR, pos.y - screenR, screenR * 2, screenR * 2);
          ctx.restore();

          // Border
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, screenR, 0, Math.PI * 2);
          ctx.strokeStyle = isHovered ? "#fff" : TYPE_COLORS.artist + "80";
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.stroke();
        } else {
          // Fallback: colored circle with initial
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, screenR, 0, Math.PI * 2);
          ctx.fillStyle = TYPE_COLORS.artist;
          ctx.fill();

          if (screenR > 6) {
            ctx.fillStyle = "#fff";
            ctx.font = `bold ${Math.max(8, screenR * 0.6)}px system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(n.title[0].toUpperCase(), pos.x, pos.y + 1);
          }

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, screenR, 0, Math.PI * 2);
          ctx.strokeStyle = isHovered ? "#fff" : TYPE_COLORS.artist + "60";
          ctx.lineWidth = isHovered ? 2 : 1;
          ctx.stroke();
        }

        // Labels — always show on mini version
        const labelY = pos.y + screenR + 12;
        const fontSize = Math.max(8, Math.min(11, 9 * camera.zoom));

        ctx.fillStyle = isHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)";
        ctx.font = `${isHovered ? 700 : 500} ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(n.title, pos.x, labelY);

        // Degree badge
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = `${fontSize - 1}px monospace`;
        ctx.fillText(`${n.degree} vazeb`, pos.x, labelY + fontSize + 2);
      });

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [camera, hovered, nodes, edges, imagesLoaded]);

  // Mouse handlers
  const getMousePos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const findNodeAt = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const maxDegree = Math.max(...nodes.map((n) => n.degree), 1);

      return nodes.find((n) => {
        const t = Math.log(n.degree) / Math.log(maxDegree);
        const r = (6 + t * 14) * camera.zoom;
        const pos = worldToScreen(camera, n.x, n.y, cx, cy);
        const dx = pos.x - sx;
        const dy = pos.y - sy;
        return dx * dx + dy * dy < r * r;
      });
    },
    [camera, nodes],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e.clientX, e.clientY);

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

      const node = findNodeAt(pos.x, pos.y);
      setHovered(node ? node.id : null);
    },
    [camera, getMousePos, findNodeAt],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e.clientX, e.clientY);
      const node = findNodeAt(pos.x, pos.y);
      if (!node) {
        isPanningRef.current = true;
        panStartRef.current = { x: pos.x, y: pos.y };
        cameraStartRef.current = { ...camera };
      }
    },
    [camera, getMousePos, findNodeAt],
  );

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    panStartRef.current = null;
    cameraStartRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
    isPanningRef.current = false;
    panStartRef.current = null;
    cameraStartRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(3, camera.zoom * zoomFactor));
      setCamera((c) => ({ ...c, zoom: newZoom }));
    },
    [camera],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) return;
      const pos = getMousePos(e.clientX, e.clientY);
      const node = findNodeAt(pos.x, pos.y);
      if (node) {
        router.push(`${TYPE_ROUTE_MAP.artist}/${node.slug}`);
      }
    },
    [getMousePos, findNodeAt, router],
  );

  return (
    <div className="relative w-full h-[280px] sm:h-[340px] md:h-[420px]" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer touch-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleClick}
      />
    </div>
  );
}
