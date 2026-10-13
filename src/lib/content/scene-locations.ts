/**
 * Definice měst CZ/SK rapové scény — JEDEN zdroj pravdy.
 *
 * Proč: homepage, mapa i listing musí ukazovat STEJNÝ počet měst.
 * Dřív měl každý pohled vlastní filtr → homepage 38, mapa 12, data 42.
 *
 * Pravidlo: „město scény" = lokalita, odkud interpreti pocházejí (ORIGINATES_FROM).
 * Vylučujeme:
 *   - ZEMĚ (Česko, Slovensko) — nejsou to města
 *   - ZAHRANIČNÍ města (Londýn, Manchester, Francie) — mimo scope CZ/SK
 */

/** Lokality, které NEJSOU městem scény (země + zahraničí). */
export const NON_SCENE_LOCATIONS = new Set<string>([
  "location_cesko",
  "location_slovensko",
  "location_londyn",
  "location_manchester",
  "location_francie-jizni",
  // Mimo CZ/SK scénu — rodiště ano, ale není to město scény
  "location_kisinev", // Calin — narodil se v Moldavsku
]);

/** Je daná lokalita městem CZ/SK rapové scény? */
export function isSceneCity(locationId: string): boolean {
  return !NON_SCENE_LOCATIONS.has(locationId);
}
