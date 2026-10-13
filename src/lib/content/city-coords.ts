/**
 * Zeměpisné souřadnice měst CZ/SK rapové scény (WGS84).
 *
 * Formát: [zeměpisná délka (lon), zeměpisná šířka (lat)] — v tomto pořadí,
 * protože ho očekává projektToMap() v map-geometry.ts.
 *
 * Používá /mapa (SVG projekce bodů na obrys země).
 * Města, která nejsou městem scény (země, zahraničí), řeší isSceneCity().
 */
export const CITY_COORDS: Record<string, [number, number]> = {
  "location_bratislava": [17.1077, 48.1486],
  "location_brno": [16.6068, 49.1951],
  "location_ceske-budejovice": [14.4743, 48.9745],
  "location_cheb": [12.3739, 50.0793],
  "location_dobrichovice": [14.2720, 49.9273],
  "location_chomutov": [13.4177, 50.4605],
  "location_handlova": [18.7596, 48.7277],
  "location_hostivice": [14.2585, 50.0796],
  "location_hradec-kralove": [15.8252, 50.2104],
  "location_jihlava": [15.5912, 49.3961],
  "location_karlovy-vary": [12.871, 50.2319],
  "location_kladno": [14.1025, 50.1473],
  "location_kolin": [15.2003, 50.0281],
  "location_kosice": [21.2611, 48.7164],
  "location_kromeriz": [17.393, 49.298],
  "location_liberec": [15.0543, 50.7663],
  "location_lucenec": [19.666, 48.3317],
  "location_namestovo": [19.4809, 49.4067],
  "location_nitra": [18.0864, 48.3069],
  "location_nove-mesto-nad-vahom": [17.832, 48.7559],
  "location_olomouc": [17.2509, 49.5938],
  "location_ostrava": [18.2625, 49.8209],
  "location_ostrov": [12.939, 50.3054],
  "location_pardubice": [15.7812, 50.0343],
  "location_piestany": [17.8265, 48.5918],
  "location_plzen": [13.3736, 49.7384],
  "location_praha": [14.4378, 50.0755],
  "location_presov": [21.2393, 48.9975],
  "location_ruzomberok": [19.3078, 49.0748],
  "location_rychnov-nad-kneznou": [16.2747, 50.1629],
  "location_slany": [14.0867, 50.2306],
  "location_starovice": [16.7258, 48.9481],
  "location_tabor": [14.6579, 49.4144],
  "location_teplice": [13.8248, 50.6404],
  "location_trnava": [17.5872, 48.3774],
  "location_usti-nad-labem": [14.0522, 50.6611],
  "location_zlate-moravce": [18.3997, 48.3832],
  "location_zlin": [17.6666, 49.2263],
};
