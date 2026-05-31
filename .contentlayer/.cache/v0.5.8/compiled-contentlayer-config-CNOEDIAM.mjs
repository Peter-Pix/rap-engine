// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer2/source-files";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// src/lib/remark-interlinking.ts
import { visit, SKIP } from "unist-util-visit";
var TYPE_TO_PATH = {
  rapper: "/raperi",
  album: "/alba",
  label: "/labely",
  zanr: "/zanry"
};
var SKIP_PARENT_TYPES = /* @__PURE__ */ new Set([
  "link",
  "inlineCode",
  "code",
  "html",
  "heading"
]);
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getCurrentDocument(file) {
  const raw = file?.data?.rawDocumentData;
  if (!raw?.sourceFileName) return null;
  const slug = raw.sourceFileName.replace(/\.mdx$/, "");
  const type = raw.sourceFileDir || "";
  return { slug, type };
}
function remarkInterlinking(options) {
  const { registry } = options;
  const sortedRegistry = [...registry].sort((a, b) => b.name.length - a.name.length);
  return (tree, file) => {
    const current = getCurrentDocument(file);
    const currentSlug = current?.slug || "";
    const currentDir = current?.type || "";
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === void 0) return;
      if (SKIP_PARENT_TYPES.has(parent.type)) return;
      const text = node.value;
      if (!text || text.length < 3) return;
      const matches = [];
      for (const entity of sortedRegistry) {
        const entityDirMap = {
          rapper: "raperi",
          album: "alba",
          label: "labely",
          zanr: "zanry"
        };
        if (entity.slug === currentSlug && entityDirMap[entity.type] === currentDir) {
          continue;
        }
        const names = [entity.name, ...entity.aliases || []];
        for (const name of names) {
          const flags = entity.caseSensitive === false ? "gi" : "g";
          const regex = new RegExp(
            `(?<![A-Za-z\\u00C0-\\u024F])${escapeRegex(name)}(?![A-Za-z\\u00C0-\\u024F])`,
            flags
          );
          let m;
          while ((m = regex.exec(text)) !== null) {
            matches.push({
              start: m.index,
              end: m.index + m[0].length,
              entity,
              matched: m[0]
            });
          }
        }
      }
      if (matches.length === 0) return;
      matches.sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return b.end - b.start - (a.end - a.start);
      });
      const filtered = [];
      let lastEnd = -1;
      for (const m of matches) {
        if (m.start >= lastEnd) {
          filtered.push(m);
          lastEnd = m.end;
        }
      }
      if (filtered.length === 0) return;
      const newChildren = [];
      let cursor = 0;
      for (const m of filtered) {
        if (m.start > cursor) {
          newChildren.push({
            type: "text",
            value: text.slice(cursor, m.start)
          });
        }
        newChildren.push({
          type: "link",
          url: `${TYPE_TO_PATH[m.entity.type]}/${m.entity.slug}`,
          title: null,
          data: {
            hProperties: {
              className: ["entity-link", `entity-link--${m.entity.type}`],
              "data-entity-type": m.entity.type,
              "data-entity-slug": m.entity.slug
            }
          },
          children: [{ type: "text", value: m.matched }]
        });
        cursor = m.end;
      }
      if (cursor < text.length) {
        newChildren.push({
          type: "text",
          value: text.slice(cursor)
        });
      }
      ;
      parent.children.splice(index, 1, ...newChildren);
      return [SKIP, index + newChildren.length];
    });
  };
}

// src/lib/interlinking.ts
var ENTITY_REGISTRY = [
  {
    "name": "[Gudlak]",
    "slug": "gudlak",
    "type": "album"
  },
  {
    "name": "1987",
    "slug": "1987",
    "type": "album"
  },
  {
    "name": "2020",
    "slug": "2020",
    "type": "album"
  },
  {
    "name": "2051",
    "slug": "2051",
    "type": "album"
  },
  {
    "name": "217",
    "slug": "217",
    "type": "album"
  },
  {
    "name": "666",
    "slug": "666",
    "type": "album"
  },
  {
    "name": "713 a\u017E na v\u011Bky",
    "slug": "713-az-na-veky",
    "type": "album"
  },
  {
    "name": "9EVET",
    "slug": "9evet",
    "type": "album"
  },
  {
    "name": "Acoustic Session",
    "slug": "acoustic-session",
    "type": "album"
  },
  {
    "name": "Adi\xE9 (feat. Grizzly)",
    "slug": "adie-feat-grizzly",
    "type": "album"
  },
  {
    "name": "Adios",
    "slug": "adios",
    "type": "album"
  },
  {
    "name": "Aether",
    "slug": "aether",
    "type": "album"
  },
  {
    "name": "Airon Meidan",
    "slug": "airon-meidan",
    "type": "album"
  },
  {
    "name": "All My Life",
    "slug": "all-my-life",
    "type": "album"
  },
  {
    "name": "Amonit (Deluxe)",
    "slug": "amonit",
    "type": "album"
  },
  {
    "name": "Backwoods Bred",
    "slug": "backwoods-bred",
    "type": "album"
  },
  {
    "name": "BEN\u0130M",
    "slug": "benim",
    "type": "album"
  },
  {
    "name": "Bezo m\u0148a",
    "slug": "bezo-mna",
    "type": "album"
  },
  {
    "name": "B\xCDLEJ JAK ST\u011ANA",
    "slug": "bilej-jak-stena",
    "type": "album"
  },
  {
    "name": "Bomba",
    "slug": "bomba",
    "type": "album"
  },
  {
    "name": "Boomerang",
    "slug": "boomerang",
    "type": "album"
  },
  {
    "name": "Brazilie",
    "slug": "brazilie",
    "type": "album"
  },
  {
    "name": "Celebrity Rehab",
    "slug": "celebrity-rehab",
    "type": "album"
  },
  {
    "name": "\u010C\xEDsla",
    "slug": "cisla",
    "type": "album"
  },
  {
    "name": "DANK",
    "slug": "dank",
    "type": "album"
  },
  {
    "name": "Dead Man Walking",
    "slug": "dead-man-walking",
    "type": "album"
  },
  {
    "name": "Definice Rapu",
    "slug": "definice-rapu",
    "type": "album"
  },
  {
    "name": "Designer Flow",
    "slug": "designer-flow",
    "type": "album"
  },
  {
    "name": "Detektor",
    "slug": "detektor",
    "type": "album"
  },
  {
    "name": "Detektor II",
    "slug": "detektor-ii",
    "type": "album"
  },
  {
    "name": "Diamant",
    "slug": "diamant",
    "type": "album"
  },
  {
    "name": "Dinarah",
    "slug": "dinarah",
    "type": "album"
  },
  {
    "name": "Dobr\xE1 Du\u0161e, Srdce ze Zlata",
    "slug": "dobra-duse-srdce-ze-zlata",
    "type": "album"
  },
  {
    "name": "Draci",
    "slug": "draci",
    "type": "album"
  },
  {
    "name": "Erupce",
    "slug": "erupce",
    "type": "album"
  },
  {
    "name": "Eskort",
    "slug": "eskort",
    "type": "album"
  },
  {
    "name": "Evoluce haranta",
    "slug": "evoluce-haranta",
    "type": "album"
  },
  {
    "name": "F4R4on",
    "slug": "f4r4on",
    "type": "album"
  },
  {
    "name": "Fight",
    "slug": "fight",
    "type": "album"
  },
  {
    "name": "Finesa",
    "slug": "finesa",
    "type": "album"
  },
  {
    "name": "FREE KARLO",
    "slug": "free-karlo",
    "type": "album"
  },
  {
    "name": "Gesta",
    "slug": "gesta",
    "type": "album"
  },
  {
    "name": "Habibi (Remix)",
    "slug": "habibi-remix",
    "type": "album"
  },
  {
    "name": "Harant",
    "slug": "harant",
    "type": "album"
  },
  {
    "name": "Hladina (feat. LENNY)",
    "slug": "hladina-feat-lenny",
    "type": "album"
  },
  {
    "name": "Hood Vil",
    "slug": "hood-vil",
    "type": "album"
  },
  {
    "name": "Horizonty",
    "slug": "horizonty",
    "type": "album"
  },
  {
    "name": "Hr\xE1\u010D Roku Playlist",
    "slug": "hrac-roku-playlist",
    "type": "album"
  },
  {
    "name": "Chimera Pt. 3",
    "slug": "chimera-pt-3",
    "type": "album"
  },
  {
    "name": "J. EDEN",
    "slug": "j-eden",
    "type": "album"
  },
  {
    "name": "J. EDEN DVA",
    "slug": "j-eden-dva",
    "type": "album"
  },
  {
    "name": "J. EDEN E-G3N (#freekarlo edition)",
    "slug": "j-eden-e-g3n",
    "type": "album"
  },
  {
    "name": "J. EDEN E-GEN (mixed by NobodyListen)",
    "slug": "j-eden-e-gen-mixed-by-nobodylisten",
    "type": "album"
  },
  {
    "name": "J\xE1 & Moje",
    "slug": "ja-moje",
    "type": "album"
  },
  {
    "name": "Je\u010F Tvrd\u011B Nebo Je\u010F Domu",
    "slug": "jed-tvrde-nebo-jed-domu",
    "type": "album"
  },
  {
    "name": "Jedna Dva",
    "slug": "jedna-dva",
    "type": "album"
  },
  {
    "name": "JUSTiCE44 (Ledov\xE1 Cesta)",
    "slug": "justice44-ledova-cesta",
    "type": "album"
  },
  {
    "name": "JUSTiCE44 (Mixtape1)",
    "slug": "justice44-mixtape1",
    "type": "album"
  },
  {
    "name": "karant\xE9na",
    "slug": "karantena",
    "type": "album"
  },
  {
    "name": "Kawasaki",
    "slug": "kawasaki",
    "type": "album"
  },
  {
    "name": "Ka\u017Eday",
    "slug": "kazday",
    "type": "album"
  },
  {
    "name": "kdy\u017E jedeme v noci",
    "slug": "kdyz-jedeme-v-noci",
    "type": "album"
  },
  {
    "name": "Klony",
    "slug": "klony",
    "type": "album"
  },
  {
    "name": "Kokalero",
    "slug": "kokalero",
    "type": "album"
  },
  {
    "name": "Kolem stolu (feat. Separ & Nerie\u0161)",
    "slug": "kolem-stolu-feat-separ-neries",
    "type": "album"
  },
  {
    "name": "Kotvim",
    "slug": "kotvim",
    "type": "album"
  },
  {
    "name": "Krtek Forever",
    "slug": "krtek-forever",
    "type": "album"
  },
  {
    "name": "KRTEK MONEY LIFE",
    "slug": "krtek-money-life",
    "type": "album"
  },
  {
    "name": "Kruhy & Vlny",
    "slug": "kruhy-a-vlny",
    "type": "album"
  },
  {
    "name": "Kruhy & Vlny (217 Twins Edition)",
    "slug": "kruhy-vlny",
    "type": "album"
  },
  {
    "name": "L\xE1ska & Bolest",
    "slug": "laska-bolest",
    "type": "album"
  },
  {
    "name": "Livin (feat. Rest) (UMP Beats Remix)",
    "slug": "livin-feat-rest-ump-beats-remix",
    "type": "album"
  },
  {
    "name": "Loco (feat. Zea)",
    "slug": "loco-feat-zea",
    "type": "album"
  },
  {
    "name": "Majitel",
    "slug": "majitel",
    "type": "album"
  },
  {
    "name": "Mal\xFD Pepek Mixtape Vol. 1",
    "slug": "maly-pepek-mixtape-vol-1",
    "type": "album"
  },
  {
    "name": "Manifest (feat. Jakub D\u011Bkan)",
    "slug": "manifest-feat-jakub-dekan",
    "type": "album"
  },
  {
    "name": "Marko",
    "slug": "marko",
    "type": "album"
  },
  {
    "name": "Masky",
    "slug": "masky",
    "type": "album"
  },
  {
    "name": "Mawar",
    "slug": "mawar",
    "type": "album"
  },
  {
    "name": "Medusa",
    "slug": "medusa",
    "type": "album"
  },
  {
    "name": "Melan\u017E",
    "slug": "melanz",
    "type": "album"
  },
  {
    "name": "Mezi prsty",
    "slug": "mezi-prsty",
    "type": "album"
  },
  {
    "name": "Mikasa Sukasa",
    "slug": "mikasa-sukasa",
    "type": "album"
  },
  {
    "name": "Million",
    "slug": "million",
    "type": "album"
  },
  {
    "name": "Modrob\xEDl\xE1 krev",
    "slug": "modrobila-krev",
    "type": "album"
  },
  {
    "name": "Moj \u017Divot",
    "slug": "moj-zivot",
    "type": "album"
  },
  {
    "name": "Molo",
    "slug": "molo",
    "type": "album"
  },
  {
    "name": "Molo II (Deluxe)",
    "slug": "molo-ii",
    "type": "album"
  },
  {
    "name": "Monology",
    "slug": "monology",
    "type": "album"
  },
  {
    "name": "Mozoly",
    "slug": "mozoly",
    "type": "album"
  },
  {
    "name": "NA ROHU",
    "slug": "na-rohu",
    "type": "album"
  },
  {
    "name": "NAHORU NA DNO",
    "slug": "nahoru-na-dno",
    "type": "album"
  },
  {
    "name": "Narcos",
    "slug": "narcos",
    "type": "album"
  },
  {
    "name": "Necejtim Nic",
    "slug": "necejtim-nic",
    "type": "album"
  },
  {
    "name": "Nejsem S\xE1m",
    "slug": "nejsem-sam",
    "type": "album"
  },
  {
    "name": "Nem\u016F\u017Eu P\u0159estat",
    "slug": "nemuzu-prestat",
    "type": "album"
  },
  {
    "name": "Nen\xED Pozd\u011B",
    "slug": "neni-pozde",
    "type": "album"
  },
  {
    "name": "Neony (feat. Miris)",
    "slug": "neony-feat-miris",
    "type": "album"
  },
  {
    "name": "Nep\xFDtam Sa",
    "slug": "nepytam-sa",
    "type": "album"
  },
  {
    "name": "NEROZUM\xCD N\xC1M (2soft)",
    "slug": "nerozumi-nam-2soft",
    "type": "album"
  },
  {
    "name": "Nevzl\xE1tejte",
    "slug": "nevzlatejte",
    "type": "album"
  },
  {
    "name": "Nezn\xE1me Stres",
    "slug": "nezname-stres",
    "type": "album"
  },
  {
    "name": "Nic v\xEDc (feat. Martin C\xEDsar)",
    "slug": "nic-vic-feat-martin-cisar",
    "type": "album"
  },
  {
    "name": "Nirvana",
    "slug": "nirvana",
    "type": "album"
  },
  {
    "name": "Novej Sv\u011Bt",
    "slug": "novej-svet",
    "type": "album"
  },
  {
    "name": "Original",
    "slug": "original",
    "type": "album"
  },
  {
    "name": "P's A Love",
    "slug": "ps-a-love",
    "type": "album"
  },
  {
    "name": "Pablo",
    "slug": "pablo",
    "type": "album"
  },
  {
    "name": "P\xE1r listov z roku 2009",
    "slug": "par-listov-z-roku-2009",
    "type": "album"
  },
  {
    "name": "Paranoia",
    "slug": "paranoia",
    "type": "album"
  },
  {
    "name": "Pararampam",
    "slug": "pararampam",
    "type": "album"
  },
  {
    "name": "Pay Out",
    "slug": "pay-out",
    "type": "album"
  },
  {
    "name": "Play",
    "slug": "play",
    "type": "album"
  },
  {
    "name": "POD MLHOU",
    "slug": "pod-mlhou",
    "type": "album"
  },
  {
    "name": "Pod Vlivem",
    "slug": "pod-vlivem",
    "type": "album"
  },
  {
    "name": "PODIVEJ MAMA",
    "slug": "podivej-mama",
    "type": "album"
  },
  {
    "name": "POPSTAR",
    "slug": "popstar",
    "type": "album"
  },
  {
    "name": "Pozd\u011B",
    "slug": "pozde",
    "type": "album"
  },
  {
    "name": "Prdele V Plamenech (feat. Separ)",
    "slug": "prdele-v-plamenech-feat-separ",
    "type": "album"
  },
  {
    "name": "Premi\xE9ra",
    "slug": "premiera",
    "type": "album"
  },
  {
    "name": "Produkt",
    "slug": "produkt",
    "type": "album"
  },
  {
    "name": "Proud",
    "slug": "proud",
    "type": "album"
  },
  {
    "name": "Prozyum",
    "slug": "prozyum",
    "type": "album"
  },
  {
    "name": "Puff Puff Pass [???]",
    "slug": "puff-puff-pass",
    "type": "album"
  },
  {
    "name": "Real Hustle\u0159i Nesp\xED",
    "slug": "real-hustleri-nespi",
    "type": "album"
  },
  {
    "name": "Reflektuju",
    "slug": "reflektuju",
    "type": "album"
  },
  {
    "name": "Rick nebo Raf",
    "slug": "rick-nebo-raf",
    "type": "album"
  },
  {
    "name": "Rick nebo Raf (Remix)",
    "slug": "rick-nebo-raf-remix",
    "type": "album"
  },
  {
    "name": "RIOT",
    "slug": "riot",
    "type": "album"
  },
  {
    "name": "ROADTRIP",
    "slug": "roadtrip",
    "type": "album"
  },
  {
    "name": "Rodinnej Typ",
    "slug": "rodinnej-typ",
    "type": "album"
  },
  {
    "name": "Royal II",
    "slug": "royal-ii",
    "type": "album"
  },
  {
    "name": "Sbohem Roxano",
    "slug": "sbohem-roxano",
    "type": "album"
  },
  {
    "name": "SELFMADE",
    "slug": "selfmade",
    "type": "album"
  },
  {
    "name": "She!sh",
    "slug": "she-sh",
    "type": "album"
  },
  {
    "name": "Showtime",
    "slug": "showtime",
    "type": "album"
  },
  {
    "name": "skibidi alpha wolf type shi ep",
    "slug": "skibidi-alpha-wolf-type-shi-ep",
    "type": "album"
  },
  {
    "name": "Slova",
    "slug": "slova",
    "type": "album"
  },
  {
    "name": "Sny & No\u010Dn\xED M\u016Fry",
    "slug": "sny-nocni-mury",
    "type": "album"
  },
  {
    "name": "Spolu",
    "slug": "spolu",
    "type": "album"
  },
  {
    "name": "Srdce z ledu (feat. Marcell) (Acoustic Session)",
    "slug": "srdce-z-ledu-feat-marcell-acoustic-session",
    "type": "album"
  },
  {
    "name": "Stamina",
    "slug": "stamina",
    "type": "album"
  },
  {
    "name": "Starkids",
    "slug": "starkids",
    "type": "album"
  },
  {
    "name": "Starkids (Remix)",
    "slug": "starkids-remix",
    "type": "album"
  },
  {
    "name": "Starship: Oblivion",
    "slug": "starship-oblivion",
    "type": "album"
  },
  {
    "name": "Stormbreaker (feat. Martin Matys)",
    "slug": "stormbreaker-feat-martin-matys",
    "type": "album"
  },
  {
    "name": "Sv\u011Bdom\xED",
    "slug": "svedomi",
    "type": "album"
  },
  {
    "name": "Sv\u011Bt",
    "slug": "svet",
    "type": "album"
  },
  {
    "name": "SWAG",
    "slug": "swag",
    "type": "album"
  },
  {
    "name": "Talk2me",
    "slug": "talk2me",
    "type": "album"
  },
  {
    "name": "Talk2me (NobodyListen Remix)",
    "slug": "talk2me-nobodylisten-remix",
    "type": "album"
  },
  {
    "name": "Teorie p\xE1du",
    "slug": "teorie-padu",
    "type": "album"
  },
  {
    "name": "Tetris",
    "slug": "tetris",
    "type": "album"
  },
  {
    "name": "Timeless Emotions",
    "slug": "timeless-emotions",
    "type": "album"
  },
  {
    "name": "Tonout v t\xF3nech",
    "slug": "tonout-v-tonech",
    "type": "album"
  },
  {
    "name": "Topstv\xED",
    "slug": "topstvi",
    "type": "album"
  },
  {
    "name": "Trip",
    "slug": "trip",
    "type": "album"
  },
  {
    "name": "Ty V\xED\u0161",
    "slug": "ty-vis",
    "type": "album"
  },
  {
    "name": "TYPE BEAT / HIP THRUST",
    "slug": "type-beat-hip-thrust",
    "type": "album"
  },
  {
    "name": "UPS",
    "slug": "ups",
    "type": "album"
  },
  {
    "name": "V\xA0hlavn\xED roli",
    "slug": "v-hlavni-roli",
    "type": "album"
  },
  {
    "name": "V\xE1lky",
    "slug": "valky",
    "type": "album"
  },
  {
    "name": "VD\u011A\u010CNEJ",
    "slug": "vdecnej",
    "type": "album"
  },
  {
    "name": "Vr\xE1na k Vr\xE1n\u011B",
    "slug": "vrana-k-vrane",
    "type": "album"
  },
  {
    "name": "WAGWAN",
    "slug": "wagwan",
    "type": "album"
  },
  {
    "name": "WorldWide Way",
    "slug": "worldwide-way",
    "type": "album"
  },
  {
    "name": "Yzomandias (Remaster)",
    "slug": "yzomandias",
    "type": "album"
  },
  {
    "name": "Yzotape",
    "slug": "yzotape",
    "type": "album"
  },
  {
    "name": "Za 2 Dny 20 G",
    "slug": "za-2-dny-20-g",
    "type": "album"
  },
  {
    "name": "Za N\xE1s",
    "slug": "za-nas",
    "type": "album"
  },
  {
    "name": "Ze Dna",
    "slug": "ze-dna",
    "type": "album"
  },
  {
    "name": "Zhora Vypad\xE1 V\u0161echno L\xEDp",
    "slug": "zhora-vypada-vsechno-lip",
    "type": "album"
  },
  {
    "name": "Z\xF3na",
    "slug": "zona",
    "type": "album"
  },
  {
    "name": "ZP\xC1TKY NA SVOJ\xCD PLANETU",
    "slug": "zpatky-na-svoji-planetu",
    "type": "album"
  },
  {
    "name": "\u017Dijeme Rap",
    "slug": "zijeme-rap",
    "type": "album"
  },
  {
    "name": "1312 Records",
    "slug": "1312-records",
    "type": "label"
  },
  {
    "name": "Archetyp 51",
    "slug": "archetyp-51",
    "type": "label"
  },
  {
    "name": "Azurit Kingdom",
    "slug": "azurit-kingdom",
    "type": "label"
  },
  {
    "name": "BiggBoss",
    "slug": "biggboss",
    "type": "label"
  },
  {
    "name": "Blakkwood Records",
    "slug": "blakkwood-records",
    "type": "label"
  },
  {
    "name": "Central Gang",
    "slug": "central-gang",
    "type": "label"
  },
  {
    "name": "Everydays",
    "slug": "everydays",
    "type": "label"
  },
  {
    "name": "F*CK THEM",
    "slug": "fuck-them",
    "type": "label"
  },
  {
    "name": "Hypno808",
    "slug": "hypno-808",
    "type": "label"
  },
  {
    "name": "Churaq Clique",
    "slug": "churaq-clique",
    "type": "label"
  },
  {
    "name": "Mike Roft Records",
    "slug": "mike-roft-records",
    "type": "label"
  },
  {
    "name": "Pozor Records",
    "slug": "pozor-records",
    "type": "label"
  },
  {
    "name": "PVP Label",
    "slug": "pvp-label",
    "type": "label"
  },
  {
    "name": "Rychl\xED Kluci",
    "slug": "rychli-kluci",
    "type": "label"
  },
  {
    "name": "Skerocuda",
    "slug": "skerocuda",
    "type": "label"
  },
  {
    "name": "TroubleGang",
    "slug": "troublegang",
    "type": "label"
  },
  {
    "name": "Ty Nikdy",
    "slug": "ty-nikdy",
    "type": "label"
  },
  {
    "name": "ZNK (Zevlounsk\xE1 Nepora\u017Een\xE1 Komise)",
    "slug": "znk",
    "type": "label"
  },
  {
    "name": "58G",
    "slug": "58g",
    "type": "rapper"
  },
  {
    "name": "Alla Xul Elu",
    "slug": "alla-xul-elu",
    "type": "rapper"
  },
  {
    "name": "Ariez Baby",
    "slug": "ariez-baby",
    "type": "rapper"
  },
  {
    "name": "Astral One",
    "slug": "astral-one",
    "type": "rapper"
  },
  {
    "name": "AstralKid22",
    "slug": "astralkid22",
    "type": "rapper"
  },
  {
    "name": "BADBOY BERLIN",
    "slug": "badboy-berlin",
    "type": "rapper"
  },
  {
    "name": "Big Boy Kea",
    "slug": "big-boy-kea",
    "type": "rapper"
  },
  {
    "name": "Big Narstie",
    "slug": "big-narstie",
    "type": "rapper"
  },
  {
    "name": "Blako",
    "slug": "blako",
    "type": "rapper"
  },
  {
    "name": "Bobby Blaze",
    "slug": "bobby-blaze",
    "type": "rapper"
  },
  {
    "name": "Brandon Beal",
    "slug": "brandon-beal",
    "type": "rapper"
  },
  {
    "name": "Bun B",
    "slug": "bun-b",
    "type": "rapper"
  },
  {
    "name": "CA$HANOVA BULHAR",
    "slug": "ca-hanova-bulhar",
    "type": "rapper"
  },
  {
    "name": "Calin",
    "slug": "calin",
    "type": "rapper",
    "aliases": [
      "C\u0103lin Panfili"
    ]
  },
  {
    "name": "Camille Jones",
    "slug": "camille-jones",
    "type": "rapper"
  },
  {
    "name": "Cashanova Bulhar",
    "slug": "cashanova-bulhar",
    "type": "rapper",
    "aliases": [
      "Mat\u011Bj Kratejl"
    ]
  },
  {
    "name": "Clemens",
    "slug": "clemens",
    "type": "rapper"
  },
  {
    "name": "Clemens & Jon",
    "slug": "clemens-jon",
    "type": "rapper"
  },
  {
    "name": "Crudd2Active",
    "slug": "crudd2active",
    "type": "rapper"
  },
  {
    "name": "CRYSTAL KIDZ",
    "slug": "crystal-kidz",
    "type": "rapper"
  },
  {
    "name": "D Ritch",
    "slug": "d-ritch",
    "type": "rapper"
  },
  {
    "name": "D.Kop",
    "slug": "d-kop",
    "type": "rapper"
  },
  {
    "name": "Dano Kapit\xE1n",
    "slug": "dano-kapitan",
    "type": "rapper"
  },
  {
    "name": "David Beng Rosta\u0161",
    "slug": "david-beng-rostas",
    "type": "rapper"
  },
  {
    "name": "Decky",
    "slug": "decky",
    "type": "rapper"
  },
  {
    "name": "DEJV",
    "slug": "dejv",
    "type": "rapper"
  },
  {
    "name": "DJ AKA",
    "slug": "dj-aka",
    "type": "rapper"
  },
  {
    "name": "DJ Fatte",
    "slug": "dj-fatte",
    "type": "rapper"
  },
  {
    "name": "DJ Kadr",
    "slug": "dj-kadr",
    "type": "rapper"
  },
  {
    "name": "Dj Opia",
    "slug": "dj-opia",
    "type": "rapper"
  },
  {
    "name": "DJ Wich",
    "slug": "dj-wich",
    "type": "rapper"
  },
  {
    "name": "DMS",
    "slug": "dms",
    "type": "rapper"
  },
  {
    "name": "DPLMT",
    "slug": "dplmt",
    "type": "rapper"
  },
  {
    "name": "DUPPY",
    "slug": "duppy",
    "type": "rapper"
  },
  {
    "name": "Dusan Vlk",
    "slug": "dusan-vlk",
    "type": "rapper"
  },
  {
    "name": "Eight O",
    "slug": "eight-o",
    "type": "rapper"
  },
  {
    "name": "Elektrickmann",
    "slug": "elektrickmann",
    "type": "rapper"
  },
  {
    "name": "Eliozie",
    "slug": "eliozie",
    "type": "rapper"
  },
  {
    "name": "Fleixxer P",
    "slug": "fleixxer-p",
    "type": "rapper"
  },
  {
    "name": "Flirta D",
    "slug": "flirta-d",
    "type": "rapper"
  },
  {
    "name": "Forest Blunt",
    "slug": "forest-blunt",
    "type": "rapper"
  },
  {
    "name": "Frank Flames",
    "slug": "frank-flames",
    "type": "rapper"
  },
  {
    "name": "Fuckstroy",
    "slug": "fuckstroy",
    "type": "rapper"
  },
  {
    "name": "Gizmo",
    "slug": "gizmo",
    "type": "rapper"
  },
  {
    "name": "guapanova",
    "slug": "guapanova",
    "type": "rapper"
  },
  {
    "name": "Haades",
    "slug": "haades",
    "type": "rapper"
  },
  {
    "name": "Hattori",
    "slug": "hattori",
    "type": "rapper"
  },
  {
    "name": "Hellwana",
    "slug": "hellwana",
    "type": "rapper"
  },
  {
    "name": "Hex Rated",
    "slug": "hex-rated",
    "type": "rapper"
  },
  {
    "name": "Hirmix",
    "slug": "hirmix",
    "type": "rapper"
  },
  {
    "name": "Horror Avantgarda",
    "slug": "horror-avantgarda",
    "type": "rapper"
  },
  {
    "name": "Hugo Toxxx",
    "slug": "hugo-toxxx",
    "type": "rapper",
    "aliases": [
      "Jan Dan\u011Bk"
    ]
  },
  {
    "name": "Chachi",
    "slug": "chachi",
    "type": "rapper"
  },
  {
    "name": "Chawo",
    "slug": "chawo",
    "type": "rapper"
  },
  {
    "name": "Chetta",
    "slug": "chetta",
    "type": "rapper"
  },
  {
    "name": "Chubeats",
    "slug": "chubeats",
    "type": "rapper"
  },
  {
    "name": "Ida Corr",
    "slug": "ida-corr",
    "type": "rapper"
  },
  {
    "name": "Idea",
    "slug": "idea",
    "type": "rapper",
    "aliases": [
      "Josef Zm\u011Bl\xEDk"
    ]
  },
  {
    "name": "Igor",
    "slug": "igor",
    "type": "rapper"
  },
  {
    "name": "Ill Bill",
    "slug": "ill-bill",
    "type": "rapper"
  },
  {
    "name": "Indy",
    "slug": "indy",
    "type": "rapper",
    "aliases": [
      "Andreas Christodoulou"
    ]
  },
  {
    "name": "Infernal",
    "slug": "infernal",
    "type": "rapper"
  },
  {
    "name": "James Cole",
    "slug": "james-cole",
    "type": "rapper",
    "aliases": [
      "Daniel \u010Eurech"
    ]
  },
  {
    "name": "Jana Kirschner",
    "slug": "jana-kirschner",
    "type": "rapper"
  },
  {
    "name": "Jay Amo",
    "slug": "jay-amo",
    "type": "rapper"
  },
  {
    "name": "Jeezy",
    "slug": "jeezy",
    "type": "rapper"
  },
  {
    "name": "Jeremy Carr",
    "slug": "jeremy-carr",
    "type": "rapper"
  },
  {
    "name": "Jickson",
    "slug": "jickson",
    "type": "rapper"
  },
  {
    "name": "JJ Lawhorn",
    "slug": "jj-lawhorn",
    "type": "rapper"
  },
  {
    "name": "JME",
    "slug": "jme",
    "type": "rapper"
  },
  {
    "name": "Johnson",
    "slug": "johnson",
    "type": "rapper"
  },
  {
    "name": "Jon",
    "slug": "jon",
    "type": "rapper"
  },
  {
    "name": "Jords",
    "slug": "jords",
    "type": "rapper"
  },
  {
    "name": "Joshua",
    "slug": "joshua",
    "type": "rapper"
  },
  {
    "name": "Kali",
    "slug": "kali",
    "type": "rapper"
  },
  {
    "name": "Kamil Hoffmann",
    "slug": "kamil-hoffmann",
    "type": "rapper"
  },
  {
    "name": "Karlo",
    "slug": "karlo",
    "type": "rapper"
  },
  {
    "name": "Kato",
    "slug": "kato",
    "type": "rapper",
    "aliases": [
      "Adam Svato\u0161"
    ]
  },
  {
    "name": "Kl\xE1ra J\xE1nsk\xE1",
    "slug": "klara-janska",
    "type": "rapper"
  },
  {
    "name": "Koky",
    "slug": "koky",
    "type": "rapper"
  },
  {
    "name": "Kung Fu Vampire",
    "slug": "kung-fu-vampire",
    "type": "rapper"
  },
  {
    "name": "Kv\xEDtek",
    "slug": "kvitek",
    "type": "rapper"
  },
  {
    "name": "Labello",
    "slug": "labello",
    "type": "rapper"
  },
  {
    "name": "Laris Diam",
    "slug": "laris-diam",
    "type": "rapper"
  },
  {
    "name": "Lil Quill",
    "slug": "lil-quill",
    "type": "rapper"
  },
  {
    "name": "Lipo",
    "slug": "lipo",
    "type": "rapper",
    "aliases": [
      "Jon\xE1\u0161 \u010Cervinka"
    ]
  },
  {
    "name": "Loko Loko",
    "slug": "loko-loko",
    "type": "rapper"
  },
  {
    "name": "Lord Goat",
    "slug": "lord-goat",
    "type": "rapper"
  },
  {
    "name": "Loudz1",
    "slug": "loudz1",
    "type": "rapper"
  },
  {
    "name": "LP",
    "slug": "lp",
    "type": "rapper"
  },
  {
    "name": "LU2 Vinyl Flexer",
    "slug": "lu2-vinyl-flexer",
    "type": "rapper"
  },
  {
    "name": "Luisa",
    "slug": "luisa",
    "type": "rapper"
  },
  {
    "name": "Magenta",
    "slug": "magenta",
    "type": "rapper"
  },
  {
    "name": "MAKIN HOLLOV",
    "slug": "makin-hollov",
    "type": "rapper"
  },
  {
    "name": "Maniak",
    "slug": "maniak",
    "type": "rapper",
    "aliases": [
      "Ji\u0159\xED Vesel\xFD"
    ]
  },
  {
    "name": "Marger",
    "slug": "marger",
    "type": "rapper"
  },
  {
    "name": "Marpo",
    "slug": "marpo",
    "type": "rapper",
    "aliases": [
      "Otakar Pet\u0159ina"
    ]
  },
  {
    "name": "Martina P\xE1rtlov\xE1",
    "slug": "martina-partlova",
    "type": "rapper"
  },
  {
    "name": "Maxo",
    "slug": "maxo",
    "type": "rapper"
  },
  {
    "name": "Mc Cumblood",
    "slug": "mc-cumblood",
    "type": "rapper"
  },
  {
    "name": "MDMX",
    "slug": "mdmx",
    "type": "rapper"
  },
  {
    "name": "Mega M",
    "slug": "mega-m",
    "type": "rapper"
  },
  {
    "name": "Meiton",
    "slug": "meiton",
    "type": "rapper"
  },
  {
    "name": "Mike Trafik",
    "slug": "mike-trafik",
    "type": "rapper"
  },
  {
    "name": "Milion Plus",
    "slug": "milion-plus",
    "type": "rapper"
  },
  {
    "name": "Milli Major",
    "slug": "milli-major",
    "type": "rapper"
  },
  {
    "name": "Mr Be",
    "slug": "mr-be",
    "type": "rapper"
  },
  {
    "name": "Negash Ali",
    "slug": "negash-ali",
    "type": "rapper"
  },
  {
    "name": "Nia",
    "slug": "nia",
    "type": "rapper"
  },
  {
    "name": "Nobodylisten",
    "slug": "nobodylisten",
    "type": "rapper"
  },
  {
    "name": "nolackinswayy",
    "slug": "nolackinswayy",
    "type": "rapper"
  },
  {
    "name": "Non Phixion",
    "slug": "non-phixion",
    "type": "rapper"
  },
  {
    "name": "O.D.",
    "slug": "o-d",
    "type": "rapper"
  },
  {
    "name": "OFF CULTURE",
    "slug": "off-culture",
    "type": "rapper"
  },
  {
    "name": "OGmiaG",
    "slug": "ogmiag",
    "type": "rapper"
  },
  {
    "name": "Orion",
    "slug": "orion",
    "type": "rapper",
    "aliases": [
      "Michal Opletal"
    ]
  },
  {
    "name": "Outlandish",
    "slug": "outlandish",
    "type": "rapper"
  },
  {
    "name": "P Money",
    "slug": "p-money",
    "type": "rapper"
  },
  {
    "name": "P.A.T.",
    "slug": "p-a-t",
    "type": "rapper"
  },
  {
    "name": "Palermo",
    "slug": "palermo",
    "type": "rapper"
  },
  {
    "name": "Patrik Love ICY L",
    "slug": "patrik-love-icy-l",
    "type": "rapper"
  },
  {
    "name": "Paulie Garand",
    "slug": "paulie-garand",
    "type": "rapper",
    "aliases": [
      "Pavel Harant"
    ]
  },
  {
    "name": "Pissed Chriss",
    "slug": "pissed-chriss",
    "type": "rapper"
  },
  {
    "name": "Poyeeblo CG",
    "slug": "poyeeblo-cg",
    "type": "rapper"
  },
  {
    "name": "Radek \u0160karohl\xEDd",
    "slug": "radek-skarohlid",
    "type": "rapper"
  },
  {
    "name": "Radimo",
    "slug": "radimo",
    "type": "rapper"
  },
  {
    "name": "Rest",
    "slug": "rest",
    "type": "rapper",
    "aliases": [
      "Adam Chlp\xEDk"
    ]
  },
  {
    "name": "Ricky Sixx",
    "slug": "ricky-sixx",
    "type": "rapper"
  },
  {
    "name": "Robin Zoot",
    "slug": "robin-zoot",
    "type": "rapper"
  },
  {
    "name": "Rollsout",
    "slug": "rollsout",
    "type": "rapper"
  },
  {
    "name": "Rudolphh",
    "slug": "rudolphh",
    "type": "rapper"
  },
  {
    "name": "Safri Duo",
    "slug": "safri-duo",
    "type": "rapper"
  },
  {
    "name": "Sakito",
    "slug": "sakito",
    "type": "rapper"
  },
  {
    "name": "Samey",
    "slug": "samey",
    "type": "rapper"
  },
  {
    "name": "Saul",
    "slug": "saul",
    "type": "rapper"
  },
  {
    "name": "Scrufizzer",
    "slug": "scrufizzer",
    "type": "rapper"
  },
  {
    "name": "Scum",
    "slug": "scum",
    "type": "rapper"
  },
  {
    "name": "Sebastian",
    "slug": "sebastian",
    "type": "rapper"
  },
  {
    "name": "Sensey",
    "slug": "sensey",
    "type": "rapper"
  },
  {
    "name": "Sergei Barracuda",
    "slug": "sergei-barracuda",
    "type": "rapper",
    "aliases": [
      "Erik Peter"
    ]
  },
  {
    "name": "Shaka CG",
    "slug": "shaka-cg",
    "type": "rapper"
  },
  {
    "name": "SharkaSs",
    "slug": "sharkass",
    "type": "rapper",
    "aliases": [
      "Sh\xE1rka Geroldov\xE1"
    ]
  },
  {
    "name": "SHIMMI",
    "slug": "shimmi",
    "type": "rapper"
  },
  {
    "name": "SIMILIVINLIFE",
    "slug": "similivinlife",
    "type": "rapper"
  },
  {
    "name": "Slimeshotz",
    "slug": "slimeshotz",
    "type": "rapper"
  },
  {
    "name": "Sofian Medjmedj",
    "slug": "sofian-medjmedj",
    "type": "rapper"
  },
  {
    "name": "Stein27",
    "slug": "stein27",
    "type": "rapper",
    "aliases": [
      "Petr Ad\xE1mek"
    ]
  },
  {
    "name": "Strapo",
    "slug": "strapo",
    "type": "rapper"
  },
  {
    "name": "Struggle Jennings",
    "slug": "struggle-jennings",
    "type": "rapper"
  },
  {
    "name": "Supa",
    "slug": "supa",
    "type": "rapper"
  },
  {
    "name": "Sxmpra",
    "slug": "sxmpra",
    "type": "rapper"
  },
  {
    "name": "Terri B!",
    "slug": "terri-b",
    "type": "rapper"
  },
  {
    "name": "The Mag",
    "slug": "the-mag",
    "type": "rapper"
  },
  {
    "name": "Tchagun",
    "slug": "tchagun",
    "type": "rapper"
  },
  {
    "name": "Tom Necrocock",
    "slug": "tom-necrocock",
    "type": "rapper"
  },
  {
    "name": "Tom\xE1s H\xE1j\xEDcek",
    "slug": "tomas-hajicek",
    "type": "rapper"
  },
  {
    "name": "Tom\xE1\u0161 Botl\xF3",
    "slug": "tomas-botlo",
    "type": "rapper"
  },
  {
    "name": "Totally Nothin",
    "slug": "totally-nothin",
    "type": "rapper"
  },
  {
    "name": "U$O",
    "slug": "u-o",
    "type": "rapper"
  },
  {
    "name": "Vaclav Noid Barta",
    "slug": "vaclav-noid-barta",
    "type": "rapper"
  },
  {
    "name": "Vaclav Roucek",
    "slug": "vaclav-roucek",
    "type": "rapper"
  },
  {
    "name": "Velile",
    "slug": "velile",
    "type": "rapper"
  },
  {
    "name": "Vladim\xEDr 518",
    "slug": "vladimir-518",
    "type": "rapper",
    "aliases": [
      "Vladim\xEDr Bro\u017E"
    ]
  },
  {
    "name": "Vypsan\xE1 Fixa",
    "slug": "vypsana-fixa",
    "type": "rapper"
  },
  {
    "name": "weeklyn",
    "slug": "weeklyn",
    "type": "rapper"
  },
  {
    "name": "Young Jeezy",
    "slug": "young-jeezy",
    "type": "rapper"
  },
  {
    "name": "Young Rip",
    "slug": "young-rip",
    "type": "rapper"
  },
  {
    "name": "Zabson",
    "slug": "zabson",
    "type": "rapper"
  },
  {
    "name": "Zef",
    "slug": "zef",
    "type": "rapper"
  },
  {
    "name": "Zkrat Kratochv\xEDl",
    "slug": "zkrat-kratochvil",
    "type": "rapper"
  },
  {
    "name": "Boom Bap",
    "slug": "boom-bap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Britsk\xFD hip hop",
    "slug": "britsky-hip-hop",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Cloud Rap",
    "slug": "cloud-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Country Rap",
    "slug": "country-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Dark Rap",
    "slug": "dark-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Drill",
    "slug": "drill",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Drum and Bass (MC kultura)",
    "slug": "drum-and-bass-mc",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Electronic Rap",
    "slug": "electronic-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Experimental Trap",
    "slug": "experimental-trap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Gangsta Rap",
    "slug": "gangsta-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Grime",
    "slug": "grime",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Grime",
    "slug": "grime",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Hip-hop",
    "slug": "hip-hop",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Horrorcore",
    "slug": "horrorcore",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Jungle (MC kultura)",
    "slug": "jungle-mc",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Melodic Trap",
    "slug": "melodic-trap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Modern Rap",
    "slug": "modern-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Mumble Rap",
    "slug": "mumble-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Pop",
    "slug": "pop",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Pop-rap",
    "slug": "pop-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Pop-rock",
    "slug": "pop-rock",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "R&B (Contemporary R&B)",
    "slug": "rnb",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Rap",
    "slug": "rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Rock-Rap",
    "slug": "rock-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Southern Rap",
    "slug": "southern-rap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "Trap",
    "slug": "trap",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "UK Garage",
    "slug": "uk-garage",
    "type": "zanr",
    "caseSensitive": false
  },
  {
    "name": "UK Rap",
    "slug": "uk-rap",
    "type": "zanr",
    "caseSensitive": false
  }
];

// contentlayer.config.ts
var Rapper = defineDocumentType(() => ({
  name: "Rapper",
  filePathPattern: "raperi/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    slug: { type: "string", required: true },
    realName: { type: "string", required: false },
    born: { type: "string", required: false },
    active: { type: "string", required: false },
    label: { type: "string", required: false },
    genre: { type: "list", of: { type: "string" }, required: false },
    description: { type: "string", required: true },
    image: { type: "string", required: false },
    featured: { type: "boolean", default: false },
    publishedAt: { type: "date", required: true },
    updatedAt: { type: "date", required: false },
    relatedRappers: { type: "list", of: { type: "string" }, required: false },
    relatedAlbums: { type: "list", of: { type: "string" }, required: false }
  },
  computedFields: {
    url: { type: "string", resolve: (doc) => `/raperi/${doc.slug}` },
    canonicalUrl: { type: "string", resolve: (doc) => `https://4rap.cz/raperi/${doc.slug}` }
  }
}));
var Album = defineDocumentType(() => ({
  name: "Album",
  filePathPattern: "alba/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    slug: { type: "string", required: true },
    rapper: { type: "string", required: true },
    rapperSlug: { type: "string", required: true },
    label: { type: "string", required: false },
    labelSlug: { type: "string", required: false },
    year: { type: "number", required: true },
    genre: { type: "list", of: { type: "string" }, required: false },
    description: { type: "string", required: true },
    image: { type: "string", required: false },
    tracklist: { type: "list", of: { type: "string" }, required: false },
    rating: { type: "number", required: false },
    publishedAt: { type: "date", required: true },
    updatedAt: { type: "date", required: false }
  },
  computedFields: {
    url: { type: "string", resolve: (doc) => `/alba/${doc.slug}` },
    canonicalUrl: { type: "string", resolve: (doc) => `https://4rap.cz/alba/${doc.slug}` }
  }
}));
var Label = defineDocumentType(() => ({
  name: "Label",
  filePathPattern: "labely/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    slug: { type: "string", required: true },
    founded: { type: "string", required: false },
    location: { type: "string", required: false },
    description: { type: "string", required: true },
    image: { type: "string", required: false },
    artists: { type: "list", of: { type: "string" }, required: false },
    publishedAt: { type: "date", required: true }
  },
  computedFields: {
    url: { type: "string", resolve: (doc) => `/labely/${doc.slug}` },
    canonicalUrl: { type: "string", resolve: (doc) => `https://4rap.cz/labely/${doc.slug}` }
  }
}));
var Zanr = defineDocumentType(() => ({
  name: "Zanr",
  filePathPattern: "zanry/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    slug: { type: "string", required: true },
    origin: { type: "string", required: false },
    description: { type: "string", required: true },
    image: { type: "string", required: false },
    publishedAt: { type: "date", required: true }
  },
  computedFields: {
    url: { type: "string", resolve: (doc) => `/zanry/${doc.slug}` },
    canonicalUrl: { type: "string", resolve: (doc) => `https://4rap.cz/zanry/${doc.slug}` }
  }
}));
var Clanek = defineDocumentType(() => ({
  name: "Clanek",
  filePathPattern: "clanky/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    slug: { type: "string", required: true },
    category: { type: "string", required: true },
    description: { type: "string", required: true },
    image: { type: "string", required: false },
    author: { type: "string", required: false },
    featured: { type: "boolean", default: false },
    publishedAt: { type: "date", required: true },
    updatedAt: { type: "date", required: false },
    tags: { type: "list", of: { type: "string" }, required: false }
  },
  computedFields: {
    url: { type: "string", resolve: (doc) => `/clanky/${doc.slug}` },
    canonicalUrl: { type: "string", resolve: (doc) => `https://4rap.cz/clanky/${doc.slug}` },
    readingTime: {
      type: "number",
      resolve: (doc) => Math.ceil(doc.body.raw.split(/\s+/).length / 200)
    }
  }
}));
var Skladba = defineDocumentType(() => ({
  name: "Skladba",
  filePathPattern: "skladby/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    slug: { type: "string", required: true },
    rapper: { type: "string", required: true },
    rapperSlug: { type: "string", required: true },
    features: { type: "list", of: { type: "string" }, required: false },
    featuresNames: { type: "list", of: { type: "string" }, required: false },
    album: { type: "string", required: false },
    albumSlug: { type: "string", required: false },
    year: { type: "number", required: false },
    genre: { type: "list", of: { type: "string" }, required: false },
    duration: { type: "string", required: false },
    trackNumber: { type: "number", required: false },
    producers: { type: "list", of: { type: "string" }, required: false },
    producersNames: { type: "list", of: { type: "string" }, required: false },
    description: { type: "string", required: true },
    image: { type: "string", required: false },
    publishedAt: { type: "date", required: true },
    updatedAt: { type: "date", required: false }
  },
  computedFields: {
    url: { type: "string", resolve: (doc) => `/skladby/${doc.slug}` },
    canonicalUrl: { type: "string", resolve: (doc) => `https://4rap.cz/skladby/${doc.slug}` }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "content",
  documentTypes: [Rapper, Album, Label, Zanr, Clanek, Skladba],
  mdx: {
    remarkPlugins: [
      remarkGfm,
      // Auto-interlinking — každá zmínka entity se transformuje na <a>
      [remarkInterlinking, { registry: ENTITY_REGISTRY }]
    ],
    rehypePlugins: [rehypeHighlight]
  }
});
export {
  Album,
  Clanek,
  Label,
  Rapper,
  Skladba,
  Zanr,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-CNOEDIAM.mjs.map
