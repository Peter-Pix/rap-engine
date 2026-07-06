"use client";

import { useMemo } from "react";
import NetworkCanvasClient from "@/components/graph/NetworkCanvasClient";

interface GraphNode {
  id: string;
  type: string;
  slug: string;
  title: string;
  image: string | null;
  degree: number;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

interface Stats {
  nodes: number;
  edges: number;
  artists: number;
  albums: number;
  labels: number;
  locations: number;
}

interface ScenyContentProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: Stats;
}

export default function ScenyContent({ nodes, edges, stats }: ScenyContentProps) {
  // Memoize to prevent re-creating arrays when parent re-renders
  const memoizedNodes = useMemo(() => nodes, [nodes]);
  const memoizedEdges = useMemo(() => edges, [edges]);

  return (
    <>
      <main className="h-[100svh] flex flex-col bg-zinc-950 overflow-hidden">
        <div className="px-3 sm:px-8 py-2 sm:py-4 flex-shrink-0">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tighter text-white uppercase leading-[0.92]">
                Celá síť
              </h1>
              <p className="text-[10px] sm:text-sm text-white/50 mt-0.5 sm:mt-1">
                {stats.nodes} entit · {stats.edges} vazeb · {stats.artists} interpretů · {stats.albums} alb · {stats.labels} labelů · {stats.locations} měst
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-white/30 font-mono">
                Klikni → detail · Drag → posun · Scroll → zoom
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 px-0 sm:px-8 pb-[env(safe-area-inset-bottom)] sm:pb-4 relative flex flex-col">
          <NetworkCanvasClient nodes={memoizedNodes} edges={memoizedEdges} />
          
          {/* Mobile hint */}
          <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 sm:hidden bg-zinc-900/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/[0.08]">
            <p className="text-[9px] text-white/40 font-mono">
              Tap → detail · Drag → posun · Pinch → zoom
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
