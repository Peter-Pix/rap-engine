/**
 * One-shot script: add important missing artists to 44rap
 *
 * Usage: npx tsx scripts/add-important-to-44rap.ts
 */

import { createRapper, Base44Rapper } from "../src/lib/api/44rap";

const important: Partial<Base44Rapper>[] = [
  {
    artist_name: "7krát3",
    real_name: "Štěpán Hebík",
    country: "CZ",
    city: "České Budějovice",
    birth_place: "České Budějovice",
    active_since: "2019",
    short_intro:
      "Český zpěvák, producent a rapper s excentrickým projevem a ojedinělým zvukem moderního R&B, soulu a neo-funku. Průlom přišel s debutovým singlem Promiň (2019) nominovaným na cenu Anděl.",
    style_tags: ["R&B", "Soul", "Neo-Funk", "Pop Rap"],
    themes: ["Intimita", "Sebepoznání", "Vztahy"],
    label: "Bigg Boss",
    status: "published",
  },
  {
    artist_name: "Ego",
    real_name: "Michal Straka",
    country: "SK",
    city: "Lučenec",
    birth_place: "Lučenec",
    birth_date: "08.11.1983",
    active_since: "1997",
    short_intro:
      "Slovenský rapper a člen legendární skupiny Kontrafakt. Na scéně od konce 90. let, od roku 2001 s Rytmusem a DJ Anysem v Kontrafaktu. Autor sólových alb Precedens (2017) a EGOTRON (2020).",
    style_tags: ["Rap", "Hip-Hop", "Pop Rap"],
    themes: ["Životní styl", "Sebevědomí", "Karneval"],
    label: "Tvoj Tatko Records",
    status: "published",
  },
  {
    artist_name: "Orion",
    real_name: "Michal Opletal",
    country: "CZ",
    city: "Náchod",
    birth_place: "Náchod",
    birth_date: "21.06.1976",
    active_since: "1993",
    short_intro:
      "Český rapper, zakladatel PSH a průkopník domácího hip hopu. Na scéně od roku 1993. Sólová série Teritorium, za Teritorium II získal Cenu Anděl 2006.",
    style_tags: ["Rap", "Hip-Hop", "Old School"],
    themes: ["Teritorium", "Stará škola", "Hip-hopová kultura"],
    label: "Bigg Boss",
    status: "published",
  },
  {
    artist_name: "PTK",
    real_name: "Patrik Aišman",
    country: "CZ",
    city: "Cheb",
    birth_place: "Cheb",
    birth_date: "12.01.1994",
    active_since: "2013",
    short_intro:
      "Český rapper a zakladatel merch značky Iced Out. Na scéně od 2013, průlom s trilogií Nevezmu tě z klubu domů (33M+ YouTube views). Tři alba v roce 2023, GOLDEN HILL a SILENT KILL na #1 v IFPI.",
    style_tags: ["Trap", "Dark Trap", "Cloud Rap"],
    themes: ["Úspěch", "Luxus", "Deprese", "Osamělost"],
    status: "published",
  },
  {
    artist_name: "Hugo Toxxx",
    real_name: "Jan Daněk",
    country: "CZ",
    city: "Praha",
    birth_place: "Praha",
    birth_date: "16.09.1982",
    active_since: "2000",
    short_intro:
      "Kontroverzní legenda českého rapu. Excentrický projev, nekonvenční texty a schopnost být vždy napřed. Polovina scény ho považovala za blázna, druhá ho po letech kopírovala.",
    style_tags: ["Rap", "Experimental", "Alternative Rap"],
    themes: ["Kontroverze", "Alternativa", "Nonkonformita"],
    status: "published",
  },
  {
    artist_name: "Vec",
    real_name: "Branislav Kováč",
    country: "SK",
    city: "Zlaté Moravce",
    birth_place: "Zlaté Moravce",
    birth_date: "31.01.1976",
    active_since: "1995",
    short_intro:
      "Slovenský rapper považovaný za jednoho z nejlepších textařů v CZ/SK prostoru. Člen Západoslovenskej, dlouholetá kariéra od 90. let.",
    style_tags: ["Rap", "Conscious Rap", "Boom Bap"],
    themes: ["Společnost", "Autenticita", "Textařina"],
    status: "published",
  },
  {
    artist_name: "Majself",
    real_name: "Michal Švehla",
    country: "SK",
    city: "Bratislava",
    birth_place: "Bratislava",
    birth_date: "07.02.1987",
    active_since: "2005",
    short_intro:
      "Slovenský rapper a člen undergroundové legendy DMS. Výrazná postava slovenské rapové scény s důrazem na kvalitní textařinu.",
    style_tags: ["Rap", "Underground Rap", "Boom Bap"],
    themes: ["Autenticita", "Pouliční realita", "Textařina"],
    label: "DMS",
    status: "published",
  },
  {
    artist_name: "Delik",
    real_name: "Michal Pastorok",
    country: "SK",
    city: "Handlová",
    birth_place: "Handlová",
    birth_date: "29.11.1982",
    active_since: "2000",
    short_intro:
      "Slovenský rapper s výrazným hlubokým hlasem, člen uskupení H16. Dlouholetá kariéra na slovenské rapové scéně.",
    style_tags: ["Rap", "Hip-Hop"],
    themes: ["Pouliční realita", "Životní příběhy"],
    status: "published",
  },
  {
    artist_name: "Porsche Boy",
    real_name: "",
    country: "CZ",
    city: "Brno",
    active_since: "2019",
    short_intro:
      "Člen Milion+ crew. Rapper spojený s brněnskou scénou a labelem Milion+.",
    style_tags: ["Trap", "Rap"],
    themes: ["Životní styl", "Mládež"],
    label: "Milion+",
    status: "published",
  },
  {
    artist_name: "Hard Rico",
    real_name: "Enrico Pešta",
    country: "CZ",
    city: "Ostrava",
    birth_place: "Ostrava",
    birth_date: "2002",
    active_since: "2020",
    short_intro:
      "Nejrychleji rostoucí hvězda českého rapu. Z ostravské periferie na vrchol hitparád během pár let. Držitel cen OSA, kontroverzní osobnost.",
    style_tags: ["Trap", "Drill", "Street Rap"],
    themes: ["Kriminalita", "Chudoba", "Úspěch", "Kontroverze"],
    status: "published",
  },
];

async function main() {
  console.log(`Adding ${important.length} artists to 44rap...\n`);

  for (const artist of important) {
    process.stdout.write(`${artist.artist_name}... `);
    const result = await createRapper(artist);
    if (result.error) {
      console.log(`❌ ${result.error}`);
    } else {
      const data = result.data as any;
      console.log(`✅ ${data?.id || "OK"}`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});