"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

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

const NetworkCanvas = dynamic(
  () => import("@/components/graph/NetworkCanvas"),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-white/50">Načítání grafu...</div> }
);

export default function NetworkCanvasWrapper({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-white/50">Načítání grafu...</div>}>
      <NetworkCanvas nodes={nodes} edges={edges} />
    </Suspense>
  );
}
