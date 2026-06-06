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
    "name": "1000",
    "slug": "1000",
    "type": "album"
  },
  {
    "name": "2 MOUCHY 1 RANOU",
    "slug": "2-mouchy-1-ranou",
    "type": "album"
  },
  {
    "name": "2051",
    "slug": "2051",
    "type": "album"
  },
  {
    "name": "3017",
    "slug": "3017",
    "type": "album"
  },
  {
    "name": "713",
    "slug": "713",
    "type": "album"
  },
  {
    "name": "9 Years of Moan Part 2",
    "slug": "9-years-of-moan-part-2",
    "type": "album"
  },
  {
    "name": "9EVET",
    "slug": "9evet",
    "type": "album"
  },
  {
    "name": "Ach Ano III: Ballerbyn",
    "slug": "ach-ano-iii-ballerbyn",
    "type": "album"
  },
  {
    "name": "Ach Ano Mixtape",
    "slug": "ach-ano-mixtape",
    "type": "album"
  },
  {
    "name": "Airon Meidan",
    "slug": "airon-meidan",
    "type": "album"
  },
  {
    "name": "ALIEN",
    "slug": "alien",
    "type": "album"
  },
  {
    "name": "ALIEN: Expansion Pack",
    "slug": "alien-expansion-pack",
    "type": "album"
  },
  {
    "name": "Alliwant Wax digital 001 VA",
    "slug": "alliwant-wax-digital-001-va",
    "type": "album"
  },
  {
    "name": "Alliwant Wax digital 002",
    "slug": "alliwant-wax-digital-002",
    "type": "album"
  },
  {
    "name": "Alliwant Wax digital 010",
    "slug": "alliwant-wax-digital-010",
    "type": "album"
  },
  {
    "name": "Amonit (Deluxe)",
    "slug": "amonit",
    "type": "album"
  },
  {
    "name": "Antarktida",
    "slug": "antarktida",
    "type": "album"
  },
  {
    "name": "Aura",
    "slug": "aura",
    "type": "album"
  },
  {
    "name": "Avec Moi",
    "slug": "avec-moi",
    "type": "album"
  },
  {
    "name": "Babushka Traphouse",
    "slug": "babushka-traphouse",
    "type": "album"
  },
  {
    "name": "Babushka Traphouse afterparty",
    "slug": "babushka-traphouse-afterparty",
    "type": "album"
  },
  {
    "name": "Backwoods Bred",
    "slug": "backwoods-bred",
    "type": "album"
  },
  {
    "name": "Bandana",
    "slug": "bandana",
    "type": "album"
  },
  {
    "name": "Bauch Money II",
    "slug": "bauch-money-ii",
    "type": "album"
  },
  {
    "name": "BeastMode",
    "slug": "beastmode",
    "type": "album"
  },
  {
    "name": "BEN\u0130M",
    "slug": "benim",
    "type": "album"
  },
  {
    "name": "BERSERK",
    "slug": "berserk",
    "type": "album"
  },
  {
    "name": "Better Ways",
    "slug": "better-ways",
    "type": "album"
  },
  {
    "name": "Bieber Fever",
    "slug": "bieber-fever",
    "type": "album"
  },
  {
    "name": "Bieber Fever Tour Life",
    "slug": "bieber-fever-tour-life",
    "type": "album"
  },
  {
    "name": "Black Chinese II",
    "slug": "black-chinese-ii",
    "type": "album"
  },
  {
    "name": "Boomerang",
    "slug": "boomerang",
    "type": "album"
  },
  {
    "name": "Brooklyn International",
    "slug": "brooklyn-international",
    "type": "album"
  },
  {
    "name": "C.W.A",
    "slug": "c-w-a",
    "type": "album"
  },
  {
    "name": "CA$HFLOW",
    "slug": "ca-hflow",
    "type": "album"
  },
  {
    "name": "CityLights",
    "slug": "citylights",
    "type": "album"
  },
  {
    "name": "Close To Me EP",
    "slug": "close-to-me-ep",
    "type": "album"
  },
  {
    "name": "Counted Out Deluxe",
    "slug": "counted-out-deluxe",
    "type": "album"
  },
  {
    "name": "Co\u017E takhle d\xE1t si Tesa\u0159",
    "slug": "coz-takhle-dat-si-tesar",
    "type": "album"
  },
  {
    "name": "Crazy Horse",
    "slug": "crazy-horse",
    "type": "album"
  },
  {
    "name": "Crimson Stain",
    "slug": "crimson-stain",
    "type": "album"
  },
  {
    "name": "\u010CERN\xC1 VR\xC1NA",
    "slug": "cerna-vrana",
    "type": "album"
  },
  {
    "name": "\u010Cernej k\u016F\u0148",
    "slug": "cernej-kun",
    "type": "album"
  },
  {
    "name": "\u010Cernej k\u016F\u0148 plus",
    "slug": "cernej-kun-plus",
    "type": "album"
  },
  {
    "name": "Daleko bl\xED\u017E",
    "slug": "daleko-bliz",
    "type": "album"
  },
  {
    "name": "Dance for You",
    "slug": "dance-for-you",
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
    "name": "Different Time",
    "slug": "different-time",
    "type": "album"
  },
  {
    "name": "Dobr\xE1 Du\u0161e, Srdce ze Zlata",
    "slug": "dobra-duse-srdce-ze-zlata",
    "type": "album"
  },
  {
    "name": "Doggin em",
    "slug": "doggin-em",
    "type": "album"
  },
  {
    "name": "Don't Stop This Feeling",
    "slug": "don-t-stop-this-feeling",
    "type": "album"
  },
  {
    "name": "Don't Tell The Truth",
    "slug": "don-t-tell-the-truth",
    "type": "album"
  },
  {
    "name": "DONE",
    "slug": "done",
    "type": "album"
  },
  {
    "name": "DOWN4LIFE",
    "slug": "down4life",
    "type": "album"
  },
  {
    "name": "Drag4Hard",
    "slug": "drag4hard",
    "type": "album"
  },
  {
    "name": "DRIPOLAR",
    "slug": "dripolar",
    "type": "album"
  },
  {
    "name": "Dropbox",
    "slug": "dropbox",
    "type": "album"
  },
  {
    "name": "EP01",
    "slug": "ep01",
    "type": "album"
  },
  {
    "name": "Every Night EP",
    "slug": "every-night-ep",
    "type": "album"
  },
  {
    "name": "F4R4on",
    "slug": "f4r4on",
    "type": "album"
  },
  {
    "name": "Fade In",
    "slug": "fade-in",
    "type": "album"
  },
  {
    "name": "Fade In (Instrumental)",
    "slug": "fade-in-instrumental",
    "type": "album"
  },
  {
    "name": "Fatte No More",
    "slug": "fatte-no-more",
    "type": "album"
  },
  {
    "name": "Feel The Groove EP",
    "slug": "feel-the-groove-ep",
    "type": "album"
  },
  {
    "name": "Feels Good",
    "slug": "feels-good",
    "type": "album"
  },
  {
    "name": "Fight",
    "slug": "fight",
    "type": "album"
  },
  {
    "name": "Finding Myself",
    "slug": "finding-myself",
    "type": "album"
  },
  {
    "name": "Finesa",
    "slug": "finesa",
    "type": "album"
  },
  {
    "name": "FLEX SYMBOL",
    "slug": "flex-symbol",
    "type": "album"
  },
  {
    "name": "French Connection / Music Is the Future",
    "slug": "french-connection-music-is-the-future",
    "type": "album"
  },
  {
    "name": "G.O.A.T.",
    "slug": "g-o-a-t",
    "type": "album"
  },
  {
    "name": "Garn Again",
    "slug": "garn-again",
    "type": "album"
  },
  {
    "name": "Get Down Ep",
    "slug": "get-down-ep",
    "type": "album"
  },
  {
    "name": "GoldKid",
    "slug": "goldkid",
    "type": "album"
  },
  {
    "name": "GOLDKID: ULTIMATE SECTION",
    "slug": "goldkid-ultimate-section",
    "type": "album"
  },
  {
    "name": "GoldKiid",
    "slug": "goldkiid",
    "type": "album"
  },
  {
    "name": "Good Night",
    "slug": "good-night",
    "type": "album"
  },
  {
    "name": "Goodfellas",
    "slug": "goodfellas",
    "type": "album"
  },
  {
    "name": "Gorila vs. Architekt",
    "slug": "gorila-vs-architekt",
    "type": "album"
  },
  {
    "name": "Gril Styl",
    "slug": "gril-styl",
    "type": "album"
  },
  {
    "name": "Guestlist",
    "slug": "guestlist",
    "type": "album"
  },
  {
    "name": "Harant",
    "slug": "harant",
    "type": "album"
  },
  {
    "name": "He Is Mine",
    "slug": "he-is-mine",
    "type": "album"
  },
  {
    "name": "Heart on Fire",
    "slug": "heart-on-fire",
    "type": "album"
  },
  {
    "name": "Hello Ibiza",
    "slug": "hello-ibiza",
    "type": "album"
  },
  {
    "name": "Highs & Lows",
    "slug": "highs-lows",
    "type": "album"
  },
  {
    "name": "Hood Celebrity 2",
    "slug": "hood-celebrity-2",
    "type": "album"
  },
  {
    "name": "Hood Celebrity 3",
    "slug": "hood-celebrity-3",
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
    "name": "I Can't Get You EP",
    "slug": "i-can-t-get-you-ep",
    "type": "album"
  },
  {
    "name": "I Love",
    "slug": "i-love",
    "type": "album"
  },
  {
    "name": "Idea x Str\xFDc Nory EP",
    "slug": "idea-x-stryc-nory-ep",
    "type": "album"
  },
  {
    "name": "Idea x TrashBoySony EP",
    "slug": "idea-x-trashboysony-ep",
    "type": "album"
  },
  {
    "name": "Idiot",
    "slug": "idiot",
    "type": "album"
  },
  {
    "name": "IF",
    "slug": "if",
    "type": "album"
  },
  {
    "name": "Imaginarium naprosto b\u011B\u017En\xFDch podivnost\xED",
    "slug": "imaginarium-naprosto-beznych-podivnosti",
    "type": "album"
  },
  {
    "name": "It's Ak!",
    "slug": "it-s-ak",
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
    "name": "Jeden",
    "slug": "jeden",
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
    "name": "Kapit\xE1n L\xE1ska (Deluxe Edition)",
    "slug": "kapitan-laska",
    "type": "album"
  },
  {
    "name": "Keep on Lovin' Me",
    "slug": "keep-on-lovin-me",
    "type": "album"
  },
  {
    "name": "Khumba",
    "slug": "khumba",
    "type": "album"
  },
  {
    "name": "Kila Zdarma (Mixtape)",
    "slug": "kila-zdarma-mixtape",
    "type": "album"
  },
  {
    "name": "KINGPIN",
    "slug": "kingpin",
    "type": "album"
  },
  {
    "name": "Koupili jsme Boha, aby za n\xE1s makal",
    "slug": "koupili-jsme-boha-aby-za-nas-makal",
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
    "name": "Let Me Tell You",
    "slug": "let-me-tell-you",
    "type": "album"
  },
  {
    "name": "Live @ O2 arena Praha",
    "slug": "live-o2-arena-praha",
    "type": "album"
  },
  {
    "name": "Maison Maniak",
    "slug": "maison-maniak",
    "type": "album"
  },
  {
    "name": "Make It Hot",
    "slug": "make-it-hot",
    "type": "album"
  },
  {
    "name": "MAMUTI L.P.",
    "slug": "mamuti-l-p",
    "type": "album"
  },
  {
    "name": "Man of the Century",
    "slug": "man-of-the-century",
    "type": "album"
  },
  {
    "name": "Maniak Muzik",
    "slug": "maniak-muzik",
    "type": "album"
  },
  {
    "name": "ManTime",
    "slug": "mantime",
    "type": "album"
  },
  {
    "name": "Marko",
    "slug": "marko",
    "type": "album"
  },
  {
    "name": "Medusa",
    "slug": "medusa",
    "type": "album"
  },
  {
    "name": "Medusa II",
    "slug": "medusa-ii",
    "type": "album"
  },
  {
    "name": "Melan\u017E",
    "slug": "melanz",
    "type": "album"
  },
  {
    "name": "Menaces & Opportunit\xE9s",
    "slug": "menaces-opportunites",
    "type": "album"
  },
  {
    "name": "Mezi prsty",
    "slug": "mezi-prsty",
    "type": "album"
  },
  {
    "name": "Mezit\xEDm",
    "slug": "mezitim",
    "type": "album"
  },
  {
    "name": "Miss You",
    "slug": "miss-you",
    "type": "album"
  },
  {
    "name": "Moby Dick",
    "slug": "moby-dick",
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
    "name": "Mr. Sergei B",
    "slug": "mr-sergei-b",
    "type": "album"
  },
  {
    "name": "Mumie (Deluxe)",
    "slug": "mumie",
    "type": "album"
  },
  {
    "name": "Nadzem\xED",
    "slug": "nadzemi",
    "type": "album"
  },
  {
    "name": "NAHORU NA DNO",
    "slug": "nahoru-na-dno",
    "type": "album"
  },
  {
    "name": "Nech Rusa flexit EP",
    "slug": "nech-rusa-flexit-ep",
    "type": "album"
  },
  {
    "name": "Never Ever Ep",
    "slug": "never-ever-ep",
    "type": "album"
  },
  {
    "name": "NIBIRU",
    "slug": "nibiru",
    "type": "album"
  },
  {
    "name": "Nirvana",
    "slug": "nirvana",
    "type": "album"
  },
  {
    "name": "No Album",
    "slug": "no-album",
    "type": "album"
  },
  {
    "name": "No Title",
    "slug": "no-title",
    "type": "album"
  },
  {
    "name": "No Words Needed",
    "slug": "no-words-needed",
    "type": "album"
  },
  {
    "name": "No\u010Dn\xED vid\u011Bn\xED",
    "slug": "nocni-videni",
    "type": "album"
  },
  {
    "name": "O beatech a lidech",
    "slug": "o-beatech-a-lidech",
    "type": "album"
  },
  {
    "name": "O Rakv\xEDch A Lidech",
    "slug": "o-rakvich-a-lidech",
    "type": "album"
  },
  {
    "name": "Off Season",
    "slug": "off-season",
    "type": "album"
  },
  {
    "name": "OneWay",
    "slug": "oneway",
    "type": "album"
  },
  {
    "name": "Opi\u010D\xED kr\xE1l vrac\xED \xFAder",
    "slug": "opici-kral-vraci-uder",
    "type": "album"
  },
  {
    "name": "Original",
    "slug": "original",
    "type": "album"
  },
  {
    "name": "Orikoule",
    "slug": "orikoule",
    "type": "album"
  },
  {
    "name": "P's A Love",
    "slug": "ps-a-love",
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
    "name": "Piedestal EP",
    "slug": "piedestal-ep",
    "type": "album"
  },
  {
    "name": "Pod Vlivem",
    "slug": "pod-vlivem",
    "type": "album"
  },
  {
    "name": "PONYA",
    "slug": "ponya",
    "type": "album"
  },
  {
    "name": "POPSTAR",
    "slug": "popstar",
    "type": "album"
  },
  {
    "name": "Pouli\u010Dn\xED Ekonomick\xE1 3: L\xE1ska & Loyalita",
    "slug": "poulicni-ekonomicka-3-laska-loyalita",
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
    "name": "Prozyum",
    "slug": "prozyum",
    "type": "album"
  },
  {
    "name": "Puls",
    "slug": "puls",
    "type": "album"
  },
  {
    "name": "Rap",
    "slug": "rap",
    "type": "album"
  },
  {
    "name": "rap disco revoluce",
    "slug": "rap-disco-revoluce",
    "type": "album"
  },
  {
    "name": "Reflex",
    "slug": "reflex",
    "type": "album"
  },
  {
    "name": "Rep",
    "slug": "rep",
    "type": "album"
  },
  {
    "name": "RIOT",
    "slug": "riot",
    "type": "album"
  },
  {
    "name": "Road 2 Redemption",
    "slug": "road-2-redemption",
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
    "name": "ROMEO",
    "slug": "romeo",
    "type": "album"
  },
  {
    "name": "\u0158ev",
    "slug": "rev",
    "type": "album"
  },
  {
    "name": "Sbohem Roxano",
    "slug": "sbohem-roxano",
    "type": "album"
  },
  {
    "name": "Short Stories",
    "slug": "short-stories",
    "type": "album"
  },
  {
    "name": "Short Stories 2",
    "slug": "short-stories-2",
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
    "name": "Somebody That I Used To Know",
    "slug": "somebody-that-i-used-to-know",
    "type": "album"
  },
  {
    "name": "Soundtrack",
    "slug": "soundtrack",
    "type": "album"
  },
  {
    "name": "Soundtrack (Instrumentals)",
    "slug": "soundtrack-instrumentals",
    "type": "album"
  },
  {
    "name": "Space Lopata",
    "slug": "space-lopata",
    "type": "album"
  },
  {
    "name": "SR\xC1T NA TO KDO JE KR\xC1L",
    "slug": "srat-na-to-kdo-je-kral",
    "type": "album"
  },
  {
    "name": "Starship: Oblivion",
    "slug": "starship-oblivion",
    "type": "album"
  },
  {
    "name": "Stop Play",
    "slug": "stop-play",
    "type": "album"
  },
  {
    "name": "StreamTape",
    "slug": "streamtape",
    "type": "album"
  },
  {
    "name": "StreamTape: V\xEDt\u011Bznej oblouk",
    "slug": "streamtape-viteznej-oblouk",
    "type": "album"
  },
  {
    "name": "Street Sermons, Vol. 1",
    "slug": "street-sermons-vol-1",
    "type": "album"
  },
  {
    "name": "St\u0159epy",
    "slug": "strepy",
    "type": "album"
  },
  {
    "name": "Sv\u011Bdom\xED",
    "slug": "svedomi",
    "type": "album"
  },
  {
    "name": "Sveteln\xFD me\u010D",
    "slug": "svetelny-mec",
    "type": "album"
  },
  {
    "name": "SWAG",
    "slug": "swag",
    "type": "album"
  },
  {
    "name": "SWAG SIDE STORY",
    "slug": "swag-side-story",
    "type": "album"
  },
  {
    "name": "Talkshow",
    "slug": "talkshow",
    "type": "album"
  },
  {
    "name": "Tango & Kou\u0159",
    "slug": "tango-kour",
    "type": "album"
  },
  {
    "name": "Tempo",
    "slug": "tempo",
    "type": "album"
  },
  {
    "name": "Tempo (Instrumental)",
    "slug": "tempo-instrumental",
    "type": "album"
  },
  {
    "name": "Teritorium I",
    "slug": "teritorium-i",
    "type": "album"
  },
  {
    "name": "Teritorium II",
    "slug": "teritorium-ii",
    "type": "album"
  },
  {
    "name": "Teritorium III.",
    "slug": "teritorium-iii",
    "type": "album"
  },
  {
    "name": "Tetris",
    "slug": "tetris",
    "type": "album"
  },
  {
    "name": "The Prodigal Son",
    "slug": "the-prodigal-son",
    "type": "album"
  },
  {
    "name": "The Text",
    "slug": "the-text",
    "type": "album"
  },
  {
    "name": "Through These Eyes",
    "slug": "through-these-eyes",
    "type": "album"
  },
  {
    "name": "THUG LOVE SOFIA",
    "slug": "thug-love-sofia",
    "type": "album"
  },
  {
    "name": "TIMBERLAKETRAPPED",
    "slug": "timberlaketrapped",
    "type": "album"
  },
  {
    "name": "TIMBERLAKETRAPPED 2",
    "slug": "timberlaketrapped-2",
    "type": "album"
  },
  {
    "name": "To je vra\u017Eda, napsal",
    "slug": "to-je-vrazda-napsal",
    "type": "album"
  },
  {
    "name": "Top Threat",
    "slug": "top-threat",
    "type": "album"
  },
  {
    "name": "TopProdukt",
    "slug": "topprodukt",
    "type": "album"
  },
  {
    "name": "Topstv\xED",
    "slug": "topstvi",
    "type": "album"
  },
  {
    "name": "Ultra! Ultra!",
    "slug": "ultra-ultra",
    "type": "album"
  },
  {
    "name": "Utr\u017Een\xFD sluch\xE1tko / Puma",
    "slug": "utrzeny-sluchatko-puma",
    "type": "album"
  },
  {
    "name": "V\\_hlavn\xED roli",
    "slug": "v-hlavni-roli",
    "type": "album"
  },
  {
    "name": "WAGWAN",
    "slug": "wagwan",
    "type": "album"
  },
  {
    "name": "Walking On EP",
    "slug": "walking-on-ep",
    "type": "album"
  },
  {
    "name": "Weekend EP",
    "slug": "weekend-ep",
    "type": "album"
  },
  {
    "name": "WELL DONE",
    "slug": "well-done",
    "type": "album"
  },
  {
    "name": "White Boy",
    "slug": "white-boy",
    "type": "album"
  },
  {
    "name": "Wygra\u0142em EP",
    "slug": "wygra-em-ep",
    "type": "album"
  },
  {
    "name": "Young Guns 01.",
    "slug": "young-guns-01",
    "type": "album"
  },
  {
    "name": "Young Guns 03.",
    "slug": "young-guns-03",
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
    "name": "ZP\xC1TKY NA SVOJ\xCD PLANETU",
    "slug": "zpatky-na-svoji-planetu",
    "type": "album"
  },
  {
    "name": "100K",
    "slug": "100k",
    "type": "label"
  },
  {
    "name": "1312 Records",
    "slug": "1312-records",
    "type": "label"
  },
  {
    "name": "415 02 Records",
    "slug": "415-02-records",
    "type": "label"
  },
  {
    "name": "44 Enterprise",
    "slug": "44-enterprise",
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
    "name": "BipolarSnowBlood",
    "slug": "bipolarsnowblood",
    "type": "label"
  },
  {
    "name": "Black Sheep Cartel",
    "slug": "black-sheep-cartel",
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
    "name": "Comebackgang",
    "slug": "comebackgang",
    "type": "label"
  },
  {
    "name": "Detektor Records",
    "slug": "detektor-records",
    "type": "label"
  },
  {
    "name": "Dvojlitrboyzz",
    "slug": "dvojlitrboyzz",
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
    "name": "Fuerza Arma",
    "slug": "fuerza-arma",
    "type": "label"
  },
  {
    "name": "Golden Touch",
    "slug": "golden-touch",
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
    "slug": "mike-roft",
    "type": "label"
  },
  {
    "name": "Milion+",
    "slug": "milion-plus",
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
    "type": "rapper",
    "aliases": [
      "Karel Ku\u010Dera",
      "TK27"
    ]
  },
  {
    "name": "Aless",
    "slug": "aless",
    "type": "rapper",
    "aliases": [
      "Alessia Capparelli"
    ]
  },
  {
    "name": "Alla Xul Elu",
    "slug": "alla-xul-elu",
    "type": "rapper",
    "aliases": [
      "Vampire",
      "Mr. Hyde",
      "Geno Cultshit"
    ]
  },
  {
    "name": "Annet X",
    "slug": "annet-x",
    "type": "rapper",
    "aliases": [
      "Aneta Charitonova"
    ]
  },
  {
    "name": "Ariez Baby",
    "slug": "ariez-baby",
    "type": "rapper",
    "aliases": [
      "Tengku Ariez Hazaril",
      "Baby Goth"
    ]
  },
  {
    "name": "Arleta",
    "slug": "arleta",
    "type": "rapper",
    "aliases": [
      "Arleta Berndorff"
    ]
  },
  {
    "name": "Astral One",
    "slug": "astral-one",
    "type": "rapper",
    "aliases": [
      "A1",
      "Astral"
    ]
  },
  {
    "name": "AstralKid22",
    "slug": "astralkid22",
    "type": "rapper",
    "aliases": [
      "Neve\u0159ejn\xE9 (\xFAdajn\u011B n\u011Bco s \u201AK\u2018)",
      "AK22",
      "Kid"
    ]
  },
  {
    "name": "BADBOY BERLIN",
    "slug": "badboy-berlin",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xFD (\xFAdajn\u011B n\u011Bmecko-\u010Desk\xFD p\u016Fvod)",
      "BBB",
      "BadBoy"
    ]
  },
  {
    "name": "Ben Cristovao",
    "slug": "ben-cristovao",
    "type": "rapper",
    "aliases": [
      "Ben da Silva Crist\xF3v\xE3o"
    ]
  },
  {
    "name": "Big Boy Kea",
    "slug": "big-boy-kea",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xFD (\xFAdajn\u011B Keanu Johnson)",
      "Kea",
      "Big Kea"
    ]
  },
  {
    "name": "Big Narstie",
    "slug": "big-narstie",
    "type": "rapper",
    "aliases": [
      "Tyrone Mark Lindo",
      "Narstie",
      "Tyrone"
    ]
  },
  {
    "name": "Blako",
    "slug": "blako",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xFD (\xFAdajn\u011B spojen\xFD s projektem *Rise of the Warrior Cop*)",
      "Blak-O",
      "B-Lako"
    ]
  },
  {
    "name": "Bobby Blaze",
    "slug": "bobby-blaze",
    "type": "rapper",
    "aliases": [
      "Blaze"
    ]
  },
  {
    "name": "Boy Wonder",
    "slug": "boy-wonder",
    "type": "rapper",
    "aliases": [
      "Luk\xE1\u0161 Jedli\u010Dka"
    ]
  },
  {
    "name": "C-Gun",
    "slug": "c-gun",
    "type": "rapper"
  },
  {
    "name": "CA$HANOVA BULHAR",
    "slug": "ca-hanova-bulhar",
    "type": "rapper",
    "aliases": [
      "Mat\u011Bj Kratejl",
      "Cashanova Bulhar"
    ]
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
    "name": "Cavalier",
    "slug": "cavalier",
    "type": "rapper",
    "aliases": [
      "Jakub Sokolowski"
    ]
  },
  {
    "name": "CJBIGSMOKE",
    "slug": "cjbigsmoke",
    "type": "rapper"
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
    "name": "\u010Cistychov",
    "slug": "cistychov",
    "type": "rapper",
    "aliases": [
      "Daniel Chl\xE1dek"
    ]
  },
  {
    "name": "D Ritch: Z\xE1hadn\xFD akademik-rapper, kter\xFD mo\u017En\xE1 neexistuje",
    "slug": "d-ritch",
    "type": "rapper",
    "aliases": [
      "Fred Ritchin / Ritch C. Savin-Williams (pravd\u011Bpodobn\u011B pseudonymn\xED spojen\xED)"
    ]
  },
  {
    "name": "D.Kop",
    "slug": "d-kop",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xFD (\xFAdajn\u011B spojen s projektem JMPZ)",
      "D.K.P.",
      "D\xEDv\u010D\xED Kop"
    ]
  },
  {
    "name": "Dalyb",
    "slug": "dalyb",
    "type": "rapper",
    "aliases": [
      "Dalibor \u0160tofan"
    ]
  },
  {
    "name": "Daniel Vardan",
    "slug": "daniel-vardan",
    "type": "rapper",
    "aliases": [
      "Daniel Pavli\u0161"
    ]
  },
  {
    "name": "Dano Kapit\xE1n",
    "slug": "dano-kapitan",
    "type": "rapper",
    "aliases": [
      "Daniel Kapit\xE1n",
      "Kapit\xE1n Korkor\xE1n",
      "Dano K.",
      "Korky"
    ]
  },
  {
    "name": "David Beng Rosta\u0161",
    "slug": "david-beng-rostas",
    "type": "rapper",
    "aliases": [
      "David Rosta\u0161",
      "Beng",
      "Bengoro"
    ]
  },
  {
    "name": "Decky",
    "slug": "decky",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xE9 (mo\u017En\xE1 D\u011Bck\xFD, Decky Ortega)",
      "D\u011Bck\xFD",
      "Decky Ortega"
    ]
  },
  {
    "name": "DEJV",
    "slug": "dejv",
    "type": "rapper",
    "aliases": [
      "David Smetana",
      "Dejv Smetana"
    ]
  },
  {
    "name": "DeSade",
    "slug": "desade",
    "type": "rapper",
    "aliases": [
      "Michal Schmutzer"
    ]
  },
  {
    "name": "DJ AKA",
    "slug": "dj-aka",
    "type": "rapper",
    "aliases": [
      "David Jekyll",
      "Aka Manah",
      "DAvID"
    ]
  },
  {
    "name": "DJ Fatte",
    "slug": "dj-fatte",
    "type": "rapper",
    "aliases": [
      "Martin Fatka",
      "Fatte",
      "DJ Fatty"
    ]
  },
  {
    "name": "DJ Kadr",
    "slug": "dj-kadr",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xE9 (neve\u0159ejn\xE9)",
      "Kadr",
      "DJ Kadr x Totally Nothin"
    ]
  },
  {
    "name": "Dj Opia",
    "slug": "dj-opia",
    "type": "rapper",
    "aliases": [
      "Roman \u0160ev\u010D\xEDk",
      "Opia",
      "DJ Opia"
    ]
  },
  {
    "name": "DJ Wich",
    "slug": "dj-wich",
    "type": "rapper",
    "aliases": [
      "Tom\xE1\u0161 Pechl\xE1k",
      "Wich"
    ]
  },
  {
    "name": "DMS",
    "slug": "dms",
    "type": "rapper"
  },
  {
    "name": "Dokkeytino",
    "slug": "dokkeytino",
    "type": "rapper",
    "aliases": [
      "Ivan Oravec"
    ]
  },
  {
    "name": "Dollar Prync",
    "slug": "dollar-prync",
    "type": "rapper"
  },
  {
    "name": "Dominik Grey",
    "slug": "dominik-grey",
    "type": "rapper",
    "aliases": [
      "Dominik \u0160rom"
    ]
  },
  {
    "name": "Dorian",
    "slug": "dorian",
    "type": "rapper",
    "aliases": [
      "David Albrecht"
    ]
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
    "name": "Ego",
    "slug": "ego",
    "type": "rapper",
    "aliases": [
      "Michal Straka"
    ]
  },
  {
    "name": "Eight O",
    "slug": "eight-o",
    "type": "rapper"
  },
  {
    "name": "Ektor",
    "slug": "ektor",
    "type": "rapper",
    "aliases": [
      "Marko Elefteriadis"
    ]
  },
  {
    "name": "El Nino",
    "slug": "el-nino",
    "type": "rapper",
    "aliases": [
      "Jan Man\u010D\xEDk"
    ]
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
    "name": "Fobia Kid",
    "slug": "fobia-kid",
    "type": "rapper",
    "aliases": [
      "Mateus Mampouya"
    ]
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
    "name": "Fvck_Kvlt",
    "slug": "fvck-kvlt",
    "type": "rapper",
    "aliases": [
      "Denis Bango"
    ]
  },
  {
    "name": "G1nter",
    "slug": "g1nter",
    "type": "rapper",
    "aliases": [
      "Michal G\xFCnter"
    ]
  },
  {
    "name": "Gizmo",
    "slug": "gizmo",
    "type": "rapper"
  },
  {
    "name": "Gleb",
    "slug": "gleb",
    "type": "rapper",
    "aliases": [
      "Gleb Veselov"
    ]
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
    "name": "Hard Rico",
    "slug": "hard-rico",
    "type": "rapper",
    "aliases": [
      "Enrico Pe\u0161ta"
    ]
  },
  {
    "name": "Harvey HF",
    "slug": "harvey-hf",
    "type": "rapper"
  },
  {
    "name": "Hasan",
    "slug": "hasan",
    "type": "rapper",
    "aliases": [
      "Josef Andreas"
    ]
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
    "name": "Hyny the Kid",
    "slug": "hyny-the-kid",
    "type": "rapper",
    "aliases": [
      "Hynek-Martin Kr\u010Dma"
    ]
  },
  {
    "name": "Chacharski",
    "slug": "chacharski",
    "type": "rapper",
    "aliases": [
      "Josef Stola\u0159"
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
    "name": "Jay Diesel",
    "slug": "jay-diesel",
    "type": "rapper",
    "aliases": [
      "Ji\u0159\xED Rejf\xED\u0159"
    ]
  },
  {
    "name": "Jeremy Carr",
    "slug": "jeremy-carr",
    "type": "rapper"
  },
  {
    "name": "Jickson",
    "slug": "jickson",
    "type": "rapper",
    "aliases": [
      "Mathivendhan",
      "JCK",
      "Jackson"
    ]
  },
  {
    "name": "Johnson",
    "slug": "johnson",
    "type": "rapper"
  },
  {
    "name": "Johny Machette",
    "slug": "johny-machette",
    "type": "rapper",
    "aliases": [
      "Jon\xE1\u0161 \u010Cumrik"
    ]
  },
  {
    "name": "Jon",
    "slug": "jon",
    "type": "rapper"
  },
  {
    "name": "Joshua",
    "slug": "joshua",
    "type": "rapper"
  },
  {
    "name": "Kamil Hoffmann",
    "slug": "kamil-hoffmann",
    "type": "rapper",
    "aliases": [
      "Kamil",
      "KH",
      "Hoffmann"
    ]
  },
  {
    "name": "Karlo",
    "slug": "karlo",
    "type": "rapper",
    "aliases": [
      "Karlo Island",
      "Karlo-Ferdinand"
    ]
  },
  {
    "name": "Katannah",
    "slug": "katannah",
    "type": "rapper",
    "aliases": [
      "Timothy Vanke"
    ]
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
    "name": "Kenny Rough",
    "slug": "kenny-rough",
    "type": "rapper"
  },
  {
    "name": "Kl\xE1ra J\xE1nsk\xE1",
    "slug": "klara-janska",
    "type": "rapper"
  },
  {
    "name": "Kojo",
    "slug": "kojo",
    "type": "rapper",
    "aliases": [
      "William Mendon\xE7a Sachambula"
    ]
  },
  {
    "name": "Koky",
    "slug": "koky",
    "type": "rapper"
  },
  {
    "name": "Koukr",
    "slug": "koukr",
    "type": "rapper",
    "aliases": [
      "Richard Klement"
    ]
  },
  {
    "name": "Kv\xEDtek",
    "slug": "kvitek",
    "type": "rapper",
    "aliases": [
      "Libor Kv\xEDtek",
      "Kv\xEDtek z horroru"
    ]
  },
  {
    "name": "LA4",
    "slug": "la4",
    "type": "rapper",
    "aliases": [
      "Martin Somr"
    ]
  },
  {
    "name": "Labello \u2013 pra\u017Esk\xFD rapper s b\u0159itvou v ruce a rt\u011Bnkou na rtech",
    "slug": "labello",
    "type": "rapper",
    "aliases": [
      "Luk\xE1\u0161 Lab\xEDk",
      "Laba"
    ]
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
    "type": "rapper",
    "aliases": [
      "Luk\xE1\u0161 Loudil",
      "Loud",
      "Loud One"
    ]
  },
  {
    "name": "LU2 Vinyl Flexer",
    "slug": "lu2-vinyl-flexer",
    "type": "rapper"
  },
  {
    "name": "Luca Brassi10x",
    "slug": "luca-brassi10x",
    "type": "rapper",
    "aliases": [
      "Luka Ma\u0161ulovi\u010D"
    ]
  },
  {
    "name": "Luisa",
    "slug": "luisa",
    "type": "rapper"
  },
  {
    "name": "Lvcas Dope",
    "slug": "lvcas-dope",
    "type": "rapper",
    "aliases": [
      "Lukas \xC7akmak (p\u016Fvodn\u011B Luk\xE1\u0161 Navr\xE1til)"
    ]
  },
  {
    "name": "Magenta",
    "slug": "magenta",
    "type": "rapper"
  },
  {
    "name": "Majk Spirit",
    "slug": "majk-spirit",
    "type": "rapper",
    "aliases": [
      "Michal Du\u0161i\u010Dka"
    ]
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
    "name": "Marcus Revolta",
    "slug": "marcus-revolta",
    "type": "rapper",
    "aliases": [
      "Marek Kaleta"
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
    "name": "MC Gey",
    "slug": "mc-gey",
    "type": "rapper",
    "aliases": [
      "Jakub Rafael"
    ]
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
    "name": "Meizyy",
    "slug": "meizyy",
    "type": "rapper",
    "aliases": [
      "Mat\u011Bj Dejdar"
    ]
  },
  {
    "name": "Michajlov",
    "slug": "michajlov",
    "type": "rapper",
    "aliases": [
      "Michal Michajlov"
    ]
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
    "name": "Morpheus",
    "slug": "morpheus",
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
    "name": "Nik Tendo",
    "slug": "nik-tendo",
    "type": "rapper",
    "aliases": [
      "Dominik Citta"
    ]
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
    "name": "P T K",
    "slug": "ptk",
    "type": "rapper",
    "aliases": [
      "Patrik Ai\u0161man"
    ]
  },
  {
    "name": "P.A.T.",
    "slug": "p-a-t",
    "type": "rapper"
  },
  {
    "name": "Pain",
    "slug": "pain",
    "type": "rapper",
    "aliases": [
      "Vojt\u011Bch Krbec"
    ]
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
    "name": "Pil C",
    "slug": "pil-c",
    "type": "rapper",
    "aliases": [
      "Luk\xE1\u0161 Kajanovi\u010D"
    ]
  },
  {
    "name": "Pissed Chriss",
    "slug": "pissed-chriss",
    "type": "rapper"
  },
  {
    "name": "Plio",
    "slug": "plio",
    "type": "rapper"
  },
  {
    "name": "Porsche Boy",
    "slug": "porsche-boy",
    "type": "rapper",
    "aliases": [
      "Michal Hliv\xE1k"
    ]
  },
  {
    "name": "Poyeeblo CG",
    "slug": "poyeeblo-cg",
    "type": "rapper"
  },
  {
    "name": "Press Premium",
    "slug": "press-premium",
    "type": "rapper",
    "aliases": [
      "Kevin Kahl, Sanchez22, CJBIGSMOKE, Voyag"
    ]
  },
  {
    "name": "Pretorian",
    "slug": "pretorian",
    "type": "rapper",
    "aliases": [
      "Jakub Gazd\xEDk"
    ]
  },
  {
    "name": "Prezident Lourajder",
    "slug": "prezident-lourajder",
    "type": "rapper",
    "aliases": [
      "Michal Ormand\xEDk"
    ]
  },
  {
    "name": "Protiva",
    "slug": "protiva",
    "type": "rapper",
    "aliases": [
      "Pavel Protiva"
    ]
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
    "name": "Redzed",
    "slug": "redzed",
    "type": "rapper",
    "aliases": [
      "Zden\u011Bk Vesel\xFD"
    ]
  },
  {
    "name": "Refew",
    "slug": "refew",
    "type": "rapper",
    "aliases": [
      "Erik G\xE1bor"
    ]
  },
  {
    "name": "Renne Dang",
    "slug": "renne-dang",
    "type": "rapper",
    "aliases": [
      "Ren\xE9 Dang"
    ]
  },
  {
    "name": "Resetedh",
    "slug": "resetedh",
    "type": "rapper",
    "aliases": [
      "Adam Hou\u0161\u0165"
    ]
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
    "name": "Robin Tent",
    "slug": "robin-tent",
    "type": "rapper",
    "aliases": [
      "Robin Stanka"
    ]
  },
  {
    "name": "Robin Zoot",
    "slug": "robin-zoot",
    "type": "rapper",
    "aliases": [
      "Robert Pouzar"
    ]
  },
  {
    "name": "Robis Hood",
    "slug": "robis-hood",
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
    "name": "Rytmus",
    "slug": "rytmus",
    "type": "rapper",
    "aliases": [
      "Patrik Vrbovsk\xFD"
    ]
  },
  {
    "name": "\u0158ezn\xEDk",
    "slug": "reznik",
    "type": "rapper",
    "aliases": [
      "Martin Pohl"
    ]
  },
  {
    "name": "Sakito",
    "slug": "sakito",
    "type": "rapper"
  },
  {
    "name": "Samey",
    "slug": "samey",
    "type": "rapper",
    "aliases": [
      "Samuel Chalupka",
      "Sameyko"
    ]
  },
  {
    "name": "Sara Rikas",
    "slug": "sara-rikas",
    "type": "rapper",
    "aliases": [
      "S\xE1ra \u0160toselov\xE1"
    ]
  },
  {
    "name": "Saul",
    "slug": "saul",
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
    "name": "Separ",
    "slug": "separ",
    "type": "rapper",
    "aliases": [
      "Michael Kme\u0165"
    ]
  },
  {
    "name": "Serega",
    "slug": "serega",
    "type": "rapper",
    "aliases": [
      "Marcel"
    ]
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
    "name": "Shadow D",
    "slug": "shadow-d",
    "type": "rapper",
    "aliases": [
      "Radek Freimann"
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
    "name": "Sharlota",
    "slug": "sharlota",
    "type": "rapper",
    "aliases": [
      "\u0160arlota Eva Tabita Frantinov\xE1"
    ]
  },
  {
    "name": "SHIMMI",
    "slug": "shimmi",
    "type": "rapper"
  },
  {
    "name": "Sima",
    "slug": "sima",
    "type": "rapper",
    "aliases": [
      "Simona H\xE9gerov\xE1"
    ]
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
    "name": "Smack One",
    "slug": "smack",
    "type": "rapper",
    "aliases": [
      "Jakub Jane\u010Dek"
    ]
  },
  {
    "name": "Sofian Medjmedj",
    "slug": "sofian-medjmedj",
    "type": "rapper",
    "aliases": [
      "Sofian"
    ]
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
    "name": "Tafrob",
    "slug": "tafrob",
    "type": "rapper",
    "aliases": [
      "Pavel Sup"
    ]
  },
  {
    "name": "Tenki",
    "slug": "tenki",
    "type": "rapper",
    "aliases": [
      "Petr G\xF6tz"
    ]
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
    "name": "TK27",
    "slug": "tk27",
    "type": "rapper",
    "aliases": [
      "Ku\u010Dera (k\u0159estn\xED jm\xE9no nezve\u0159ejn\u011Bno)"
    ]
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
    "name": "Tyler Durden",
    "slug": "tyler-durden",
    "type": "rapper",
    "aliases": [
      "David \u0160tilip"
    ]
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
    "name": "Vercetti CG",
    "slug": "vercetti-cg",
    "type": "rapper",
    "aliases": [
      "Dominik Vy\u0161ata"
    ]
  },
  {
    "name": "Viktor Sheen",
    "slug": "viktor-sheen",
    "type": "rapper",
    "aliases": [
      "Viktor Dundi\u010D"
    ]
  },
  {
    "name": "Vladimir 518",
    "slug": "vladimir-518",
    "type": "rapper",
    "aliases": [
      "Vladim\xEDr Bro\u017E"
    ]
  },
  {
    "name": "Vla\u010Fkysyn",
    "slug": "vladkysyn",
    "type": "rapper"
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
    "name": "Yambro",
    "slug": "yambro",
    "type": "rapper",
    "aliases": [
      "Vanesa Jambrozyov\xE1"
    ]
  },
  {
    "name": "Young Leosia",
    "slug": "young-leosia",
    "type": "rapper",
    "aliases": [
      "Sara Leokadia Sudo\u0142"
    ]
  },
  {
    "name": "Young Rip",
    "slug": "young-rip",
    "type": "rapper"
  },
  {
    "name": "Yzomandias",
    "slug": "yzomandias",
    "type": "rapper",
    "aliases": [
      "Jakub Vl\u010Dek"
    ]
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
    "name": "Emo rap",
    "slug": "emo-rap",
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
    birthPlace: { type: "string", required: false },
    active: { type: "string", required: false },
    label: { type: "string", required: false },
    labelSlug: { type: "string", required: false },
    genre: { type: "list", of: { type: "string" }, required: false },
    description: { type: "string", required: true },
    image: { type: "string", required: false },
    featured: { type: "boolean", default: false },
    publishedAt: { type: "date", required: true },
    updatedAt: { type: "date", required: false },
    relatedRappers: { type: "list", of: { type: "string" }, required: false },
    relatedAlbums: { type: "list", of: { type: "string" }, required: false },
    deezerId: { type: "number", required: false },
    socials: { type: "json", required: false },
    aliases: { type: "list", of: { type: "string" }, required: false },
    origin: { type: "string", required: false },
    hometown: { type: "string", required: false },
    labels: { type: "list", of: { type: "string" }, required: false },
    subgenres: { type: "list", of: { type: "string" }, required: false },
    subgenre: { type: "list", of: { type: "string" }, required: false },
    status: { type: "string", required: false },
    associatedActs: { type: "list", of: { type: "string" }, required: false },
    activeSince: { type: "string", required: false },
    createdAt: { type: "date", required: false },
    seo: { type: "json", required: false }
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
    featured: { type: "boolean", default: false },
    tracklist: { type: "list", of: { type: "string" }, required: false },
    rating: { type: "number", required: false },
    publishedAt: { type: "date", required: true },
    updatedAt: { type: "date", required: false },
    deezerAlbumId: { type: "number", required: false },
    upc: { type: "string", required: false },
    origin: { type: "string", required: false },
    releaseType: { type: "string", required: false },
    features: { type: "list", of: { type: "string" }, required: false },
    featuresNames: { type: "list", of: { type: "string" }, required: false },
    producers: { type: "list", of: { type: "string" }, required: false },
    producersNames: { type: "list", of: { type: "string" }, required: false },
    duration: { type: "number", required: false },
    explicit: { type: "boolean", default: false },
    releaseDate: { type: "date", required: false },
    nbTracks: { type: "number", required: false },
    subgenres: { type: "list", of: { type: "string" }, required: false },
    labelName: { type: "string", required: false },
    cover: { type: "string", required: false },
    aliases: { type: "list", of: { type: "string" }, required: false },
    activeSince: { type: "string", required: false }
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
    publishedAt: { type: "date", required: true },
    website: { type: "string", required: false },
    city: { type: "string", required: false },
    country: { type: "string", required: false },
    founder: { type: "string", required: false },
    genre: { type: "list", of: { type: "string" }, required: false }
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
    publishedAt: { type: "date", required: true },
    aliases: { type: "list", of: { type: "string" }, required: false },
    relatedGenres: { type: "list", of: { type: "string" }, required: false },
    caseSensitive: { type: "boolean", default: false },
    color: { type: "string", required: false }
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
    updatedAt: { type: "date", required: false },
    deezerTrackId: { type: "number", required: false },
    releaseType: { type: "string", required: false },
    explicit: { type: "boolean", default: false },
    releaseDate: { type: "date", required: false }
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
//# sourceMappingURL=compiled-contentlayer-config-MB3VFJQM.mjs.map
