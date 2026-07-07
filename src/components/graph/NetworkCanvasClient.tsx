"use client";

import { useEffect, useState } from "react";
import NetworkCanvas from "@/components/graph/NetworkCanvas";

interface GraphNode {
  id: string;
  type: string;
  slug: string;
  title: string;
  image?: string | null;
  degree: number;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

// SSR-safe placeholder — identical on server and client
function NetworkCanvasPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center text-white/50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Načítání grafu...</p>
      </div>
    </div>
  );
}

export default function NetworkCanvasClient({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <NetworkCanvasPlaceholder />;
  }

  return <NetworkCanvas nodes={nodes} edges={edges} />;
}
