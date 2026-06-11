import { readSearchIndex, hasCache } from "@/lib/content/cache-reader";
import { TYPE_ROUTE_MAP } from "@/lib/content/constants";
import type { SearchDocument } from "@/lib/search";

export const dynamic = "force-static";

export function GET() {
  if (!hasCache()) {
    return Response.json(
      { error: "No cache found — run npm run cache:build first" },
      { status: 500 },
    );
  }

  const entries = readSearchIndex();
  if (!entries) {
    return Response.json({ documents: [], total: 0 });
  }

  const docs: SearchDocument[] = entries.map((entry) => {
    const prefix = TYPE_ROUTE_MAP[entry.type] ?? `/${entry.type}`;
    return {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      slug: entry.slug,
      url: `${prefix}/${entry.slug}`,
      description: entry.description ?? "",
      context: entry.context ?? undefined,
    };
  });

  return Response.json({ documents: docs, total: docs.length });
}
