import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchResults } from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Hledat",
  description: "Fulltextové vyhledávání napříč databází české rapové scény.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">
        Hledat
      </h1>
      <Suspense fallback={<div className="text-center py-16 text-zinc-500">Načítám…</div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
