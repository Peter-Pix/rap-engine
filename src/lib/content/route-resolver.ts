import type { EntityType } from "./constants";
import { TYPE_ROUTE_MAP } from "./constants";
import { readRoutes } from "./cache-reader";

/**
 * Resolve an entity type to its URL route prefix.
 *
 * @example
 *   getRoutePrefix("artist")  → "/raperi"
 *   getRoutePrefix("genre")   → "/zanry"
 */
export function getRoutePrefix(type: string): string {
  return TYPE_ROUTE_MAP[type as EntityType] ?? `/${type}`;
}

/**
 * Given a route path (e.g. `/raperi/yzomandias`), resolve the entity ID.
 *
 * Uses the pre-built `routes.json` cache — no filesystem walk at runtime.
 * Returns `null` when the route is not in the cache.
 */
export function resolveEntityIdFromRoute(route: string): string | null {
  const routes = readRoutes();
  if (!routes) return null;
  return routes[route] ?? null;
}

/**
 * Given an entity type, return all slug→id pairs from the routes cache.
 *
 * Filters `routes.json` to only entries matching the type's route prefix.
 *
 * @example
 *   getRouteParamsForType("artist")
 *   → [{ slug: "yzomandias", id: "artist_yzomandias" }, ...]
 */
export function getRouteParamsForType(type: string): Array<{
  slug: string;
  id: string;
}> {
  const routes = readRoutes();
  if (!routes) return [];

  const prefix = getRoutePrefix(type);
  const params: Array<{ slug: string; id: string }> = [];

  for (const [route, id] of Object.entries(routes)) {
    if (route.startsWith(`${prefix}/`)) {
      const slug = route.slice(prefix.length + 1);
      params.push({ slug, id });
    }
  }

  return params;
}

/**
 * Resolve a `[type, slug]` pair from the current page context to an entity ID.
 *
 * Used by `generateStaticParams` and `generateMetadata` in route pages.
 *
 * @param type  Entity type as used in the cache (e.g. "artist")
 * @param slug  URL slug
 * @returns Entity ID or null
 */
export function resolveFromSlug(type: string, slug: string): string | null {
  const route = `${getRoutePrefix(type)}/${slug}`;
  return resolveEntityIdFromRoute(route);
}
