"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

interface MapLocation {
  id: string;
  slug: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  artistCount: number;
}

interface MapContentProps {
  locations: MapLocation[];
}

const RapMapClient = dynamic(() => import("./RapMapClient"), { ssr: false });

export default function MapContent({ locations }: MapContentProps) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <RapMapClient locations={locations} />
    </Suspense>
  );
}

function MapSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 h-[600px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#e4ff1a] mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Načítám mapu...</p>
      </div>
    </div>
  );
}