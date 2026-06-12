import { Metadata } from "next";
import { readSearchIndex } from "@/lib/content/cache-reader";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Hledat",
  description: "Fulltextové vyhledávání napříč českou a slovenskou rapovou databází.",
};

export default function SearchPage() {
  const entries = readSearchIndex() || [];
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-3">
          <span className="text-[#e4ff1a]">Hledat</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Fulltextové vyhledávání napříč {entries.length} entitami — umělci, alba, žánry, lokality a další.
        </p>
      </div>
      <SearchClient entries={entries} />
    </div>
  );
}
