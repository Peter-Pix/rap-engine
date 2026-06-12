"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import Link from "next/link";
import { Icon } from "leaflet";

interface MapLocation {
  id: string;
  slug: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  artistCount: number;
}

interface RapMapClientProps {
  locations: MapLocation[];
}

const markerIcon = new Icon({
  iconUrl:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e4ff1a" stroke="%23000" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapFitBounds({ locations }: { locations: MapLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    const bounds = locations.map((l) => [l.lat, l.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, locations]);
  return null;
}

export default function RapMapClient({ locations }: RapMapClientProps) {
  const defaultCenter: [number, number] = [49.8, 15.5];

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-12 text-center">
        <p className="text-zinc-500">Zatím nemáme lokace s GPS souřadnicemi. Přidáme je brzy!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl">
        <MapContainer
          center={defaultCenter}
          zoom={7}
          scrollWheelZoom={true}
          style={{ height: "600px", width: "100%", background: "#18181b" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapFitBounds locations={locations} />
          {locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={markerIcon}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <h3 className="font-bold text-zinc-100 text-base mb-1">
                    {loc.title}
                  </h3>
                  <p className="text-zinc-400 text-sm mb-2 line-clamp-2">
                    {loc.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-mono">
                      {loc.artistCount} {loc.artistCount === 1 ? "umělec" : loc.artistCount < 5 ? "umělci" : "umělců"}
                    </span>
                    <Link
                      href={`/lokality/${loc.slug}`}
                      className="text-xs font-bold text-[#e4ff1a] hover:underline"
                    >
                      Detail →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <Link
            key={loc.id}
            href={`/lokality/${loc.slug}`}
            className="block group"
          >
            <div className="glass glass-hover rounded-xl p-5 transition-all duration-200 group-hover:translate-y-[-1px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-zinc-100 group-hover:text-white transition-colors">
                  {loc.title}
                </h3>
                <span className="text-[10px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {loc.artistCount}×
                </span>
              </div>
              <p className="text-sm text-zinc-500 line-clamp-2">
                {loc.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}