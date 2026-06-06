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
    "name": "1ZV\xC1S (Laddy Sound)",
    "slug": "1zvas-laddy-sound",
    "type": "album"
  },
  {
    "name": "2 CHUD\xC1\u010CCI",
    "slug": "2-chudacci",
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
    "name": "4.30am",
    "slug": "4-30am",
    "type": "album"
  },
  {
    "name": "713",
    "slug": "713",
    "type": "album"
  },
  {
    "name": "713 a\u017E na v\u011Bky",
    "slug": "713-az-na-veky",
    "type": "album"
  },
  {
    "name": "9 Years of Moan Part 2",
    "slug": "9-years-of-moan-part-2",
    "type": "album"
  },
  {
    "name": "99 Lies",
    "slug": "99-lies",
    "type": "album"
  },
  {
    "name": "9EVET",
    "slug": "9evet",
    "type": "album"
  },
  {
    "name": "A Pesar de Todo",
    "slug": "a-pesar-de-todo",
    "type": "album"
  },
  {
    "name": "A+",
    "slug": "a",
    "type": "album"
  },
  {
    "name": "Abrakadabra (feat. Hellwana)",
    "slug": "abrakadabra-feat-hellwana",
    "type": "album"
  },
  {
    "name": "Afirmacja (feat. Zaywas)",
    "slug": "afirmacja-feat-zaywas",
    "type": "album"
  },
  {
    "name": "Ach Ano Bars #1",
    "slug": "ach-ano-bars-1",
    "type": "album"
  },
  {
    "name": "Ach Ano Bars #2",
    "slug": "ach-ano-bars-2",
    "type": "album"
  },
  {
    "name": "Ach Ano Bars #3",
    "slug": "ach-ano-bars-3",
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
    "name": "Ain Gon Lie",
    "slug": "ain-gon-lie",
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
    "name": "ALL STAR",
    "slug": "all-star",
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
    "name": "Angelz",
    "slug": "angelz",
    "type": "album"
  },
  {
    "name": "Antarktida",
    "slug": "antarktida",
    "type": "album"
  },
  {
    "name": "Apres ski",
    "slug": "apres-ski",
    "type": "album"
  },
  {
    "name": "AQM",
    "slug": "aqm",
    "type": "album"
  },
  {
    "name": "Around The World",
    "slug": "around-the-world",
    "type": "album"
  },
  {
    "name": "Asgard (feat. STEIN27, Ben Cristovao & KOJO)",
    "slug": "asgard-feat-stein27-ben-cristovao-kojo",
    "type": "album"
  },
  {
    "name": "ASI TO TAK MALO BY\u0164",
    "slug": "asi-to-tak-malo-byt",
    "type": "album"
  },
  {
    "name": "AssDrop",
    "slug": "assdrop",
    "type": "album"
  },
  {
    "name": "Asteroidy",
    "slug": "asteroidy",
    "type": "album"
  },
  {
    "name": "A\u0165 je klid",
    "slug": "at-je-klid",
    "type": "album"
  },
  {
    "name": "A\u0165 se to neposere!",
    "slug": "at-se-to-neposere",
    "type": "album"
  },
  {
    "name": "Aura",
    "slug": "aura",
    "type": "album"
  },
  {
    "name": "Automat",
    "slug": "automat",
    "type": "album"
  },
  {
    "name": "Avec Moi",
    "slug": "avec-moi",
    "type": "album"
  },
  {
    "name": "Avec Moi (Kevin McKay Remix)",
    "slug": "avec-moi-kevin-mckay-remix",
    "type": "album"
  },
  {
    "name": "B.M.W.",
    "slug": "b-m-w",
    "type": "album"
  },
  {
    "name": "Baba Yaga",
    "slug": "baba-yaga",
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
    "name": "Back to the Criminal",
    "slug": "back-to-the-criminal",
    "type": "album"
  },
  {
    "name": "Backwoods Bred",
    "slug": "backwoods-bred",
    "type": "album"
  },
  {
    "name": "Ballerbyn",
    "slug": "ballerbyn",
    "type": "album"
  },
  {
    "name": "Bandana",
    "slug": "bandana",
    "type": "album"
  },
  {
    "name": "Bang (feat. K Gnarly & Lil Aaron)",
    "slug": "bang-feat-k-gnarly-lil-aaron",
    "type": "album"
  },
  {
    "name": "BANG BANG",
    "slug": "bang-bang",
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
    "name": "Bengoro Trip",
    "slug": "bengoro-trip",
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
    "name": "Bez faktury (feat. Kato)",
    "slug": "bez-faktury-feat-kato",
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
    "name": "Biela limuzi\u0301na",
    "slug": "biela-limuzina",
    "type": "album"
  },
  {
    "name": "Big Badda Boom",
    "slug": "big-badda-boom",
    "type": "album"
  },
  {
    "name": "Birdeye",
    "slug": "birdeye",
    "type": "album"
  },
  {
    "name": "Birth of a King",
    "slug": "birth-of-a-king",
    "type": "album"
  },
  {
    "name": "Bite Me",
    "slug": "bite-me",
    "type": "album"
  },
  {
    "name": "Black Chinese II",
    "slug": "black-chinese-ii",
    "type": "album"
  },
  {
    "name": "Blackout",
    "slug": "blackout",
    "type": "album"
  },
  {
    "name": "Blask",
    "slug": "blask",
    "type": "album"
  },
  {
    "name": "BLISTER",
    "slug": "blister",
    "type": "album"
  },
  {
    "name": "Bl\xED\u017E (with JVNZ & D.Kop)",
    "slug": "bliz-with-jvnz-d-kop",
    "type": "album"
  },
  {
    "name": "Bl\xED\u017Eenec",
    "slug": "blizenec",
    "type": "album"
  },
  {
    "name": "BMW (feat. Indigo)",
    "slug": "bmw-feat-indigo",
    "type": "album"
  },
  {
    "name": "Bomby",
    "slug": "bomby",
    "type": "album"
  },
  {
    "name": "BONNIE & CLYDE",
    "slug": "bonnie-clyde",
    "type": "album"
  },
  {
    "name": "Boomerang",
    "slug": "boomerang",
    "type": "album"
  },
  {
    "name": "Bou\u0159e",
    "slug": "boure",
    "type": "album"
  },
  {
    "name": "Brooklyn International",
    "slug": "brooklyn-international",
    "type": "album"
  },
  {
    "name": "Budem se m\xEDt fajn",
    "slug": "budem-se-mit-fajn",
    "type": "album"
  },
  {
    "name": "Bueno",
    "slug": "bueno",
    "type": "album"
  },
  {
    "name": "Bugs Bunny",
    "slug": "bugs-bunny",
    "type": "album"
  },
  {
    "name": "Buze",
    "slug": "buze",
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
    "name": "Cartagena",
    "slug": "cartagena",
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
    "name": "Co Chtej",
    "slug": "co-chtej",
    "type": "album"
  },
  {
    "name": "Co Kdy\u017E",
    "slug": "co-kdyz",
    "type": "album"
  },
  {
    "name": "Co se d\u011Bje?!",
    "slug": "co-se-deje",
    "type": "album"
  },
  {
    "name": "Co si budem",
    "slug": "co-si-budem",
    "type": "album"
  },
  {
    "name": "Cool!",
    "slug": "cool",
    "type": "album"
  },
  {
    "name": "Corrosion Of The Beautiful",
    "slug": "corrosion-of-the-beautiful",
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
    "name": "Crash out Maniak (feat. Syan)",
    "slug": "crash-out-maniak-feat-syan",
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
    "name": "\u010Cekej ne\u010Dekan\xFD",
    "slug": "cekej-necekany",
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
    "name": "\u010CERN\xDD L\xC9TO (beats by beast remix)",
    "slug": "cerny-leto-beats-by-beast-remix",
    "type": "album"
  },
  {
    "name": "D\xE1da Patrasov\xE1 Drip",
    "slug": "dada-patrasova-drip",
    "type": "album"
  },
  {
    "name": "DAILY MILLS",
    "slug": "daily-mills",
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
    "name": "DANIEL (feat. DJ AKA)",
    "slug": "daniel-feat-dj-aka",
    "type": "album"
  },
  {
    "name": "DANIEL MCS REMIX",
    "slug": "daniel-mcs-remix",
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
    "name": "Dech",
    "slug": "dech",
    "type": "album"
  },
  {
    "name": "Dej mi cash",
    "slug": "dej-mi-cash",
    "type": "album"
  },
  {
    "name": "D\u011Bkuju",
    "slug": "dekuju",
    "type": "album"
  },
  {
    "name": "D\u011Blat to l\xEDp",
    "slug": "delat-to-lip",
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
    "name": "D\u011Bti V\u011Btru",
    "slug": "deti-vetru",
    "type": "album"
  },
  {
    "name": "D\u011Bv\u010De v prvn\xED \u0159ad\u011B (feat. Ben Cristovao)",
    "slug": "devce-v-prvni-rade-feat-ben-cristovao",
    "type": "album"
  },
  {
    "name": "Diamant",
    "slug": "diamant",
    "type": "album"
  },
  {
    "name": "Diff\xE9rent",
    "slug": "different",
    "type": "album"
  },
  {
    "name": "Different Time",
    "slug": "different-time",
    "type": "album"
  },
  {
    "name": "D\xEDky N\xE1m",
    "slug": "diky-nam",
    "type": "album"
  },
  {
    "name": "Dilema (Over U)",
    "slug": "dilema-over-u",
    "type": "album"
  },
  {
    "name": "Dirty BoomBab (feat. Nico Benz & G Melody)",
    "slug": "dirty-boombab-feat-nico-benz-g-melody",
    "type": "album"
  },
  {
    "name": "Disrespect (feat. Mike Ondo)",
    "slug": "disrespect-feat-mike-ondo",
    "type": "album"
  },
  {
    "name": "Disrespect2 (feat. Mike Ondo)",
    "slug": "disrespect2-feat-mike-ondo",
    "type": "album"
  },
  {
    "name": "DMNKFR Dominik Feri",
    "slug": "dmnkfr-dominik-feri",
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
    "name": "Dogma",
    "slug": "dogma",
    "type": "album"
  },
  {
    "name": "Doma na prdeli",
    "slug": "doma-na-prdeli",
    "type": "album"
  },
  {
    "name": "Domov",
    "slug": "domov",
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
    "name": "Dopis (feat. SKiNNY BARBER)",
    "slug": "dopis-feat-skinny-barber",
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
    "name": "Drama (feat. AWB)",
    "slug": "drama-feat-awb",
    "type": "album"
  },
  {
    "name": "dream",
    "slug": "dream",
    "type": "album"
  },
  {
    "name": "Dres",
    "slug": "dres",
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
    "name": "Druh\xFD V\xE1noce",
    "slug": "druhy-vanoce",
    "type": "album"
  },
  {
    "name": "Dr\u017E P\xED\u010Du",
    "slug": "drz-picu",
    "type": "album"
  },
  {
    "name": "Dr\u017E se - Vol1 - Laddy Sound",
    "slug": "drz-se-vol1-laddy-sound",
    "type": "album"
  },
  {
    "name": "\xC9coute",
    "slug": "ecoute",
    "type": "album"
  },
  {
    "name": "EP01",
    "slug": "ep01",
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
    "name": "Every Night EP",
    "slug": "every-night-ep",
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
    "name": "Fast Car",
    "slug": "fast-car",
    "type": "album"
  },
  {
    "name": "Fatte No More",
    "slug": "fatte-no-more",
    "type": "album"
  },
  {
    "name": "Feel Alright",
    "slug": "feel-alright",
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
    "name": "Flute Porn (feat. Radimo)",
    "slug": "flute-porn-feat-radimo",
    "type": "album"
  },
  {
    "name": "FREE KARLO",
    "slug": "free-karlo",
    "type": "album"
  },
  {
    "name": "Free Love",
    "slug": "free-love",
    "type": "album"
  },
  {
    "name": "French Connection / Music Is the Future",
    "slug": "french-connection-music-is-the-future",
    "type": "album"
  },
  {
    "name": "Fuck You",
    "slug": "fuck-you",
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
    "name": "Genocide",
    "slug": "genocide",
    "type": "album"
  },
  {
    "name": "Gentlemani",
    "slug": "gentlemani",
    "type": "album"
  },
  {
    "name": "Gesta",
    "slug": "gesta",
    "type": "album"
  },
  {
    "name": "Get Down Ep",
    "slug": "get-down-ep",
    "type": "album"
  },
  {
    "name": "Ghost Noise",
    "slug": "ghost-noise",
    "type": "album"
  },
  {
    "name": "GhostTown",
    "slug": "ghosttown",
    "type": "album"
  },
  {
    "name": "Glock",
    "slug": "glock",
    "type": "album"
  },
  {
    "name": "Go Get It (feat. Rasco)",
    "slug": "go-get-it-feat-rasco",
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
    "name": "Gotham",
    "slug": "gotham",
    "type": "album"
  },
  {
    "name": "Grand Tour",
    "slug": "grand-tour",
    "type": "album"
  },
  {
    "name": "Gril Styl",
    "slug": "gril-styl",
    "type": "album"
  },
  {
    "name": "Gucci Watch (feat. King Coop)",
    "slug": "gucci-watch-feat-king-coop",
    "type": "album"
  },
  {
    "name": "Guestlist",
    "slug": "guestlist",
    "type": "album"
  },
  {
    "name": "Ha!",
    "slug": "ha",
    "type": "album"
  },
  {
    "name": "Habibi (Remix)",
    "slug": "habibi-remix",
    "type": "album"
  },
  {
    "name": "Had",
    "slug": "had",
    "type": "album"
  },
  {
    "name": "HALLOWEEN",
    "slug": "halloween",
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
    "name": "Headshot",
    "slug": "headshot",
    "type": "album"
  },
  {
    "name": "Heart on Fire",
    "slug": "heart-on-fire",
    "type": "album"
  },
  {
    "name": "Hej More",
    "slug": "hej-more",
    "type": "album"
  },
  {
    "name": "Hell",
    "slug": "hell",
    "type": "album"
  },
  {
    "name": "Hello Ibiza",
    "slug": "hello-ibiza",
    "type": "album"
  },
  {
    "name": "Herma",
    "slug": "herma",
    "type": "album"
  },
  {
    "name": "Highs & Lows",
    "slug": "highs-lows",
    "type": "album"
  },
  {
    "name": "Hit jak bl\xE1zen",
    "slug": "hit-jak-blazen",
    "type": "album"
  },
  {
    "name": "Hlad (feat. Rest)",
    "slug": "hlad-feat-rest",
    "type": "album"
  },
  {
    "name": "Hn\xEDzdo",
    "slug": "hnizdo",
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
    "name": "Hrob",
    "slug": "hrob",
    "type": "album"
  },
  {
    "name": "Hypebeast",
    "slug": "hypebeast",
    "type": "album"
  },
  {
    "name": "Ch\xE1pe\u0161?",
    "slug": "chapes",
    "type": "album"
  },
  {
    "name": "Chimera Pt. 3",
    "slug": "chimera-pt-3",
    "type": "album"
  },
  {
    "name": "Chrst",
    "slug": "chrst",
    "type": "album"
  },
  {
    "name": "I Can't Get You EP",
    "slug": "i-can-t-get-you-ep",
    "type": "album"
  },
  {
    "name": "I Know You Hate",
    "slug": "i-know-you-hate",
    "type": "album"
  },
  {
    "name": "I Love",
    "slug": "i-love",
    "type": "album"
  },
  {
    "name": "I'm Fine",
    "slug": "i-m-fine",
    "type": "album"
  },
  {
    "name": "I'm Sorry feat. Ledniczky",
    "slug": "i-m-sorry-feat-ledniczky",
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
    "name": "Identita (feat. Boy Wonder)",
    "slug": "identita-feat-boy-wonder",
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
    "name": "Insane",
    "slug": "insane",
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
    "name": "J\xE1 tam byl",
    "slug": "ja-tam-byl",
    "type": "album"
  },
  {
    "name": "Jang Ko Cemburu",
    "slug": "jang-ko-cemburu",
    "type": "album"
  },
  {
    "name": "Japanse Tuin",
    "slug": "japanse-tuin",
    "type": "album"
  },
  {
    "name": "Je to fajn (feat. Fejbs)",
    "slug": "je-to-fajn-feat-fejbs",
    "type": "album"
  },
  {
    "name": "Je\u010F",
    "slug": "jed",
    "type": "album"
  },
  {
    "name": "Jeden",
    "slug": "jeden",
    "type": "album"
  },
  {
    "name": "Jedin\xE1\u010Dik",
    "slug": "jedinacik",
    "type": "album"
  },
  {
    "name": "Jen Thug",
    "slug": "jen-thug",
    "type": "album"
  },
  {
    "name": "Je\u0161t\u011B jednou",
    "slug": "jeste-jednou",
    "type": "album"
  },
  {
    "name": "JET SKI",
    "slug": "jet-ski",
    "type": "album"
  },
  {
    "name": "Jezdec",
    "slug": "jezdec",
    "type": "album"
  },
  {
    "name": "Jezebel",
    "slug": "jezebel",
    "type": "album"
  },
  {
    "name": "Jizvy",
    "slug": "jizvy",
    "type": "album"
  },
  {
    "name": "Just a Dream",
    "slug": "just-a-dream",
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
    "name": "Kalo Rom",
    "slug": "kalo-rom",
    "type": "album"
  },
  {
    "name": "Kapit\xE1n L\xE1ska (Deluxe Edition)",
    "slug": "kapitan-laska",
    "type": "album"
  },
  {
    "name": "Kari\xE9ra neni",
    "slug": "kariera-neni",
    "type": "album"
  },
  {
    "name": "Kari\xE9ra neni (feat. Pil C)",
    "slug": "kariera-neni-feat-pil-c",
    "type": "album"
  },
  {
    "name": "Kdo je Nory",
    "slug": "kdo-je-nory",
    "type": "album"
  },
  {
    "name": "Kdy\u017E Jedeme (feat. Dominik Rey)",
    "slug": "kdyz-jedeme-feat-dominik-rey",
    "type": "album"
  },
  {
    "name": "Kdy\u017E maj 2L show",
    "slug": "kdyz-maj-2l-show",
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
    "name": "Kick Up The Beat",
    "slug": "kick-up-the-beat",
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
    "name": "Kolaps",
    "slug": "kolaps",
    "type": "album"
  },
  {
    "name": "Kon\u010D\xED l\xE9to",
    "slug": "konci-leto",
    "type": "album"
  },
  {
    "name": "Kontokorent",
    "slug": "kontokorent",
    "type": "album"
  },
  {
    "name": "Koupili jsme Boha, aby za n\xE1s makal",
    "slug": "koupili-jsme-boha-aby-za-nas-makal",
    "type": "album"
  },
  {
    "name": "Krok co krok",
    "slug": "krok-co-krok",
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
    "name": "Kruhy",
    "slug": "kruhy",
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
    "name": "K\u0159upky",
    "slug": "krupky",
    "type": "album"
  },
  {
    "name": "Kto ma racje (PWZKRZ Remix)",
    "slug": "kto-ma-racje-pwzkrz-remix",
    "type": "album"
  },
  {
    "name": "LaryDej",
    "slug": "larydej",
    "type": "album"
  },
  {
    "name": "L\xE1ska je kdy\u017E...",
    "slug": "laska-je-kdyz",
    "type": "album"
  },
  {
    "name": "Last Call (feat. Treez Lowkey)",
    "slug": "last-call-feat-treez-lowkey",
    "type": "album"
  },
  {
    "name": "Lebron (Hot16)",
    "slug": "lebron-hot16",
    "type": "album"
  },
  {
    "name": "Legal Ways",
    "slug": "legal-ways",
    "type": "album"
  },
  {
    "name": "Legend\xE1rn\xED",
    "slug": "legendarni",
    "type": "album"
  },
  {
    "name": "Legends Never Die",
    "slug": "legends-never-die",
    "type": "album"
  },
  {
    "name": "Let Me Tell You",
    "slug": "let-me-tell-you",
    "type": "album"
  },
  {
    "name": "LETTERA D'ADDIO (feat. M\xF8se)",
    "slug": "lettera-d-addio-feat-m-se",
    "type": "album"
  },
  {
    "name": "Lettuce",
    "slug": "lettuce",
    "type": "album"
  },
  {
    "name": "LiL Bengz Slowly",
    "slug": "lil-bengz-slowly",
    "type": "album"
  },
  {
    "name": "Live @ O2 arena Praha",
    "slug": "live-o2-arena-praha",
    "type": "album"
  },
  {
    "name": "Live to See the Sunset (feat. Fokis & Regie 257)",
    "slug": "live-to-see-the-sunset-feat-fokis-regie-257",
    "type": "album"
  },
  {
    "name": "Lonely (Oliver Wolf Remix)",
    "slug": "lonely-oliver-wolf-remix",
    "type": "album"
  },
  {
    "name": "Lord Still Knows",
    "slug": "lord-still-knows",
    "type": "album"
  },
  {
    "name": "Loterie",
    "slug": "loterie",
    "type": "album"
  },
  {
    "name": "Love To Hate",
    "slug": "love-to-hate",
    "type": "album"
  },
  {
    "name": "M1",
    "slug": "m1",
    "type": "album"
  },
  {
    "name": "Ma\u010Dk\xE1\u0161 mi hada",
    "slug": "mackas-mi-hada",
    "type": "album"
  },
  {
    "name": "Maison Maniak",
    "slug": "maison-maniak",
    "type": "album"
  },
  {
    "name": "Majitel",
    "slug": "majitel",
    "type": "album"
  },
  {
    "name": "Make It Hot",
    "slug": "make-it-hot",
    "type": "album"
  },
  {
    "name": "Mal\xFD Pepek Mixtape Vol. 1",
    "slug": "maly-pepek-mixtape-vol-1",
    "type": "album"
  },
  {
    "name": "Mamba (Evolved)",
    "slug": "mamba-evolved",
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
    "name": "Mary Jane",
    "slug": "mary-jane",
    "type": "album"
  },
  {
    "name": "Matro\u0161",
    "slug": "matros",
    "type": "album"
  },
  {
    "name": "Med",
    "slug": "med",
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
    "name": "M\u011Bs\xED\u010Dn\xED den",
    "slug": "mesicni-den",
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
    "name": "Milf & Money",
    "slug": "milf-money",
    "type": "album"
  },
  {
    "name": "Mimo Z\xE1znam #1",
    "slug": "mimo-zaznam-1",
    "type": "album"
  },
  {
    "name": "Mimo Z\xE1znam #2 (feat. Laddy Sound)",
    "slug": "mimo-zaznam-2-feat-laddy-sound",
    "type": "album"
  },
  {
    "name": "Mimo Z\xE1znam #3 (feat. Dominik Rey)",
    "slug": "mimo-zaznam-3-feat-dominik-rey",
    "type": "album"
  },
  {
    "name": "Mindr\xE1k (feat. Tlustej K\xE1rl)",
    "slug": "mindrak-feat-tlustej-karl",
    "type": "album"
  },
  {
    "name": "Miracles",
    "slug": "miracles",
    "type": "album"
  },
  {
    "name": "Miss Me",
    "slug": "miss-me",
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
    "name": "Mok",
    "slug": "mok",
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
    "name": "Moment",
    "slug": "moment",
    "type": "album"
  },
  {
    "name": "Momenty",
    "slug": "momenty",
    "type": "album"
  },
  {
    "name": "Monica",
    "slug": "monica",
    "type": "album"
  },
  {
    "name": "Monology",
    "slug": "monology",
    "type": "album"
  },
  {
    "name": "Move",
    "slug": "move",
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
    "name": "M\xFAza",
    "slug": "muza",
    "type": "album"
  },
  {
    "name": "MyJsmeToV\u011Bd\u011Bli",
    "slug": "myjsmetovedeli",
    "type": "album"
  },
  {
    "name": "Myslivec mysl\xED, \u017Ee Mydl\xE1\u0159 mydl\xED (feat. Fosco Alma)",
    "slug": "myslivec-mysli-ze-mydlar-mydli-feat-fosco-alma",
    "type": "album"
  },
  {
    "name": "Na Vsechno Sam",
    "slug": "na-vsechno-sam",
    "type": "album"
  },
  {
    "name": "NADARAV",
    "slug": "nadarav",
    "type": "album"
  },
  {
    "name": "Nadzem\xED",
    "slug": "nadzemi",
    "type": "album"
  },
  {
    "name": "Nah Nah (feat. Dominik Rey)",
    "slug": "nah-nah-feat-dominik-rey",
    "type": "album"
  },
  {
    "name": "NAHORU NA DNO",
    "slug": "nahoru-na-dno",
    "type": "album"
  },
  {
    "name": "Nautshit",
    "slug": "nautshit",
    "type": "album"
  },
  {
    "name": "Naveky s vami",
    "slug": "naveky-s-vami",
    "type": "album"
  },
  {
    "name": "Nech M\u011B Zp\xEDvat",
    "slug": "nech-me-zpivat",
    "type": "album"
  },
  {
    "name": "Nech Rusa flexit",
    "slug": "nech-rusa-flexit",
    "type": "album"
  },
  {
    "name": "Nech Rusa flexit EP",
    "slug": "nech-rusa-flexit-ep",
    "type": "album"
  },
  {
    "name": "Nechu\u0165",
    "slug": "nechut",
    "type": "album"
  },
  {
    "name": "Nejde p\u0159estat (feat. MVP)",
    "slug": "nejde-prestat-feat-mvp",
    "type": "album"
  },
  {
    "name": "Neklid",
    "slug": "neklid",
    "type": "album"
  },
  {
    "name": "Nem\xE1m dost (feat. Indigo & KOJO)",
    "slug": "nemam-dost-feat-indigo-kojo",
    "type": "album"
  },
  {
    "name": "Nemo\u017Enej \u010Clov\u011Bk",
    "slug": "nemoznej-clovek",
    "type": "album"
  },
  {
    "name": "Neser m\u011B",
    "slug": "neser-me",
    "type": "album"
  },
  {
    "name": "Nest\xEDh\xE1m \u017E\xEDt sv\u016Fj \u017Eivot",
    "slug": "nestiham-zit-svuj-zivot",
    "type": "album"
  },
  {
    "name": "Never Ever Ep",
    "slug": "never-ever-ep",
    "type": "album"
  },
  {
    "name": "New Life",
    "slug": "new-life",
    "type": "album"
  },
  {
    "name": "New Vibe",
    "slug": "new-vibe",
    "type": "album"
  },
  {
    "name": "New York Metropolis",
    "slug": "new-york-metropolis",
    "type": "album"
  },
  {
    "name": "Next",
    "slug": "next",
    "type": "album"
  },
  {
    "name": "NIBIRU",
    "slug": "nibiru",
    "type": "album"
  },
  {
    "name": "Night Creatures",
    "slug": "night-creatures",
    "type": "album"
  },
  {
    "name": "Nikdy",
    "slug": "nikdy",
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
    "name": "No Love",
    "slug": "no-love",
    "type": "album"
  },
  {
    "name": "No Security",
    "slug": "no-security",
    "type": "album"
  },
  {
    "name": "No Title",
    "slug": "no-title",
    "type": "album"
  },
  {
    "name": "No Where (feat. Areina)",
    "slug": "no-where-feat-areina",
    "type": "album"
  },
  {
    "name": "No Words Needed",
    "slug": "no-words-needed",
    "type": "album"
  },
  {
    "name": "No\u010Dn\xED M\u016Fra",
    "slug": "nocni-mura",
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
    "name": "O beatech a remixech",
    "slug": "o-beatech-a-remixech",
    "type": "album"
  },
  {
    "name": "O Rakv\xEDch A Lidech",
    "slug": "o-rakvich-a-lidech",
    "type": "album"
  },
  {
    "name": "Od r\xE1na a do r\xE1na",
    "slug": "od-rana-a-do-rana",
    "type": "album"
  },
  {
    "name": "Off Season",
    "slug": "off-season",
    "type": "album"
  },
  {
    "name": "Offlife",
    "slug": "offlife",
    "type": "album"
  },
  {
    "name": "Olivia",
    "slug": "olivia",
    "type": "album"
  },
  {
    "name": "Olivia (kv\xEDtek Flip)",
    "slug": "olivia-kvitek-flip",
    "type": "album"
  },
  {
    "name": "Ona chce tan\u010Dit",
    "slug": "ona-chce-tancit",
    "type": "album"
  },
  {
    "name": "ONE MORE TIME (feat. Ghostie)",
    "slug": "one-more-time-feat-ghostie",
    "type": "album"
  },
  {
    "name": "OneWay",
    "slug": "oneway",
    "type": "album"
  },
  {
    "name": "Oni Si Myslej",
    "slug": "oni-si-myslej",
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
    "name": "Ostrava",
    "slug": "ostrava",
    "type": "album"
  },
  {
    "name": "P's A Love",
    "slug": "ps-a-love",
    "type": "album"
  },
  {
    "name": "Pal\xE1c Medi\u010Dejsk\xFD",
    "slug": "palac-medicejsky",
    "type": "album"
  },
  {
    "name": "P\xE1n sv\xFD z\xF3ny",
    "slug": "pan-svy-zony",
    "type": "album"
  },
  {
    "name": "Panama",
    "slug": "panama",
    "type": "album"
  },
  {
    "name": "P\xE1r listov z roku 2009",
    "slug": "par-listov-z-roku-2009",
    "type": "album"
  },
  {
    "name": "Paradise (feat. Renne Dang)",
    "slug": "paradise-feat-renne-dang",
    "type": "album"
  },
  {
    "name": "Paranoia",
    "slug": "paranoia",
    "type": "album"
  },
  {
    "name": "Parkovi\u0161t\u011B",
    "slug": "parkoviste",
    "type": "album"
  },
  {
    "name": "P\xE1rty Za\u010D\xEDn\xE1 (feat. Vajdis, Dynamic,, Aly Bee & Refew)",
    "slug": "party-zacina-feat-vajdis-dynamic-aly-bee-refew",
    "type": "album"
  },
  {
    "name": "Pauvre Clown",
    "slug": "pauvre-clown",
    "type": "album"
  },
  {
    "name": "Perfect Week",
    "slug": "perfect-week",
    "type": "album"
  },
  {
    "name": "Pick 6",
    "slug": "pick-6",
    "type": "album"
  },
  {
    "name": "Piedestal EP",
    "slug": "piedestal-ep",
    "type": "album"
  },
  {
    "name": "P\xEDse\u0148 kterou zn\xE1te",
    "slug": "pisen-kterou-znate",
    "type": "album"
  },
  {
    "name": "Plague",
    "slug": "plague",
    "type": "album"
  },
  {
    "name": "Planety",
    "slug": "planety",
    "type": "album"
  },
  {
    "name": "Plesniv",
    "slug": "plesniv",
    "type": "album"
  },
  {
    "name": "Pluck (Servin' You)",
    "slug": "pluck-servin-you",
    "type": "album"
  },
  {
    "name": "POD DRN",
    "slug": "pod-drn",
    "type": "album"
  },
  {
    "name": "Pod Vlivem",
    "slug": "pod-vlivem",
    "type": "album"
  },
  {
    "name": "Podvod (P\xEDse\u0148 k filmu Shoky & Morthy: Posledn\xED velk\xE1 akce)",
    "slug": "podvod-pisen-k-filmu-shoky-morthy-posledni-velka-akce",
    "type": "album"
  },
  {
    "name": "Polo da Lala",
    "slug": "polo-da-lala",
    "type": "album"
  },
  {
    "name": "Pono\u017Eky v pantofl\xEDch",
    "slug": "ponozky-v-pantoflich",
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
    "name": "Posledn\xED h\u0159eb\xEDk",
    "slug": "posledni-hrebik",
    "type": "album"
  },
  {
    "name": "Posledn\xED Joint (feat. Live Band Gipsy Wind) [Live]",
    "slug": "posledni-joint-feat-live-band-gipsy-wind-live",
    "type": "album"
  },
  {
    "name": "Pouli\u010Dn\xED Ekonomick\xE1 3: L\xE1ska & Loyalita",
    "slug": "poulicni-ekonomicka-3-laska-loyalita",
    "type": "album"
  },
  {
    "name": "Praha/V\xEDde\u0148",
    "slug": "praha-viden",
    "type": "album"
  },
  {
    "name": "Praha/V\xEDde\u0148 (viktorjebuh Remix)",
    "slug": "praha-viden-viktorjebuh-remix",
    "type": "album"
  },
  {
    "name": "Prach (z filmu BANGER. \u2013 MATAMAR Remix)",
    "slug": "prach-z-filmu-banger-matamar-remix",
    "type": "album"
  },
  {
    "name": "Prach (z filmu BANGER.)",
    "slug": "prach-z-filmu-banger",
    "type": "album"
  },
  {
    "name": "Premi\xE9ra",
    "slug": "premiera",
    "type": "album"
  },
  {
    "name": "Pressure",
    "slug": "pressure",
    "type": "album"
  },
  {
    "name": "Prestige",
    "slug": "prestige",
    "type": "album"
  },
  {
    "name": "Pretty Boy",
    "slug": "pretty-boy",
    "type": "album"
  },
  {
    "name": "Primitivo",
    "slug": "primitivo",
    "type": "album"
  },
  {
    "name": "Problems Freestyle",
    "slug": "problems-freestyle",
    "type": "album"
  },
  {
    "name": "Produkt",
    "slug": "produkt",
    "type": "album"
  },
  {
    "name": "Propad\xE1k",
    "slug": "propadak",
    "type": "album"
  },
  {
    "name": "Prozyum",
    "slug": "prozyum",
    "type": "album"
  },
  {
    "name": "P\u0159\xED\u010Diny (feat. James Cole)",
    "slug": "priciny-feat-james-cole",
    "type": "album"
  },
  {
    "name": "P\u0159ich\xE1z\xED zima",
    "slug": "prichazi-zima",
    "type": "album"
  },
  {
    "name": "Puls",
    "slug": "puls",
    "type": "album"
  },
  {
    "name": "Put It On (Remix)",
    "slug": "put-it-on-remix",
    "type": "album"
  },
  {
    "name": "Questions (feat. TM Slime)",
    "slug": "questions-feat-tm-slime",
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
    "name": "RATATATA",
    "slug": "ratatata",
    "type": "album"
  },
  {
    "name": "Real Flex Bitch",
    "slug": "real-flex-bitch",
    "type": "album"
  },
  {
    "name": "Realshit",
    "slug": "realshit",
    "type": "album"
  },
  {
    "name": "Redeemed",
    "slug": "redeemed",
    "type": "album"
  },
  {
    "name": "Reflex",
    "slug": "reflex",
    "type": "album"
  },
  {
    "name": "Renti\xE9r (feat. James Cole & TrashBoySony)",
    "slug": "rentier-feat-james-cole-trashboysony",
    "type": "album"
  },
  {
    "name": "Rep",
    "slug": "rep",
    "type": "album"
  },
  {
    "name": "Repovej Syndrom",
    "slug": "repovej-syndrom",
    "type": "album"
  },
  {
    "name": "RIFLESSO",
    "slug": "riflesso",
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
    "name": "Rodav Tu",
    "slug": "rodav-tu",
    "type": "album"
  },
  {
    "name": "Rodinnej Typ",
    "slug": "rodinnej-typ",
    "type": "album"
  },
  {
    "name": "Roluju",
    "slug": "roluju",
    "type": "album"
  },
  {
    "name": "ROMANI \u010CHAJ",
    "slug": "romani-chaj",
    "type": "album"
  },
  {
    "name": "ROMEO",
    "slug": "romeo",
    "type": "album"
  },
  {
    "name": "Roses For Roselyn",
    "slug": "roses-for-roselyn",
    "type": "album"
  },
  {
    "name": "Rossignol",
    "slug": "rossignol",
    "type": "album"
  },
  {
    "name": "R\u016F\u017Ee",
    "slug": "ruze",
    "type": "album"
  },
  {
    "name": "\u0158ev",
    "slug": "rev",
    "type": "album"
  },
  {
    "name": "SAKONESKE",
    "slug": "sakoneske",
    "type": "album"
  },
  {
    "name": "Sant\xE9",
    "slug": "sante",
    "type": "album"
  },
  {
    "name": "SAVE IT",
    "slug": "save-it",
    "type": "album"
  },
  {
    "name": "Sbohem Roxano",
    "slug": "sbohem-roxano",
    "type": "album"
  },
  {
    "name": "Scam",
    "slug": "scam",
    "type": "album"
  },
  {
    "name": "Seasoning (feat. ike)",
    "slug": "seasoning-feat-ike",
    "type": "album"
  },
  {
    "name": "Seat",
    "slug": "seat",
    "type": "album"
  },
  {
    "name": "Sedm kl\xED\u010D\u016F",
    "slug": "sedm-klicu",
    "type": "album"
  },
  {
    "name": "Serotonin (feat. Ego)",
    "slug": "serotonin-feat-ego",
    "type": "album"
  },
  {
    "name": "Set do Trap",
    "slug": "set-do-trap",
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
    "name": "Sk\xFAsenosti a n\xE1zor",
    "slug": "skusenosti-a-nazor",
    "type": "album"
  },
  {
    "name": "Slangenkop",
    "slug": "slangenkop",
    "type": "album"
  },
  {
    "name": "Slick Talk",
    "slug": "slick-talk",
    "type": "album"
  },
  {
    "name": "Slova",
    "slug": "slova",
    "type": "album"
  },
  {
    "name": "Sme to my",
    "slug": "sme-to-my",
    "type": "album"
  },
  {
    "name": "Sme to my (feat. MC Gey, Paulie Garand, Matys, Rest) (MCs Remix)",
    "slug": "sme-to-my-feat-mc-gey-paulie-garand-matys-rest-mcs-remix",
    "type": "album"
  },
  {
    "name": "Sm\u011Bj se te\u010F",
    "slug": "smej-se-ted",
    "type": "album"
  },
  {
    "name": "Smetch",
    "slug": "smetch",
    "type": "album"
  },
  {
    "name": "Smutn\xE1 Cesta 2",
    "slug": "smutna-cesta-2",
    "type": "album"
  },
  {
    "name": "So Far Gone (feat. Nate)",
    "slug": "so-far-gone-feat-nate",
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
    "name": "Sp\xE1len\xFD Mosty (feat. Dyzivv)",
    "slug": "spaleny-mosty-feat-dyzivv",
    "type": "album"
  },
  {
    "name": "Spoma\u013Eme",
    "slug": "spomalme",
    "type": "album"
  },
  {
    "name": "SQUADRA AZZURA",
    "slug": "squadra-azzura",
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
    "name": "STASH",
    "slug": "stash",
    "type": "album"
  },
  {
    "name": "Stop Play",
    "slug": "stop-play",
    "type": "album"
  },
  {
    "name": "Stovky let",
    "slug": "stovky-let",
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
    "name": "Stress Free",
    "slug": "stress-free",
    "type": "album"
  },
  {
    "name": "St\u0159epy",
    "slug": "strepy",
    "type": "album"
  },
  {
    "name": "SUBUTEX",
    "slug": "subutex",
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
    "name": "Sweet Yungins (feat. 1littdrag, Jumpout & 1luhs0saa)",
    "slug": "sweet-yungins-feat-1littdrag-jumpout-1luhs0saa",
    "type": "album"
  },
  {
    "name": "SWEJJ Boom Bomm",
    "slug": "swejj-boom-bomm",
    "type": "album"
  },
  {
    "name": "Swipe",
    "slug": "swipe",
    "type": "album"
  },
  {
    "name": "\u0160ed\xE1 eminence (feat. Separ)",
    "slug": "seda-eminence-feat-separ",
    "type": "album"
  },
  {
    "name": "\u0160kola \u017Di\u017Ekova",
    "slug": "skola-zizkova",
    "type": "album"
  },
  {
    "name": "\u0160pinav\xE9 prachy",
    "slug": "spinave-prachy",
    "type": "album"
  },
  {
    "name": "Tabu",
    "slug": "tabu",
    "type": "album"
  },
  {
    "name": "Tak a te\u010F!",
    "slug": "tak-a-ted",
    "type": "album"
  },
  {
    "name": "Taki tw\xF3r",
    "slug": "taki-twor",
    "type": "album"
  },
  {
    "name": "Talkshow",
    "slug": "talkshow",
    "type": "album"
  },
  {
    "name": "Tancuj sama",
    "slug": "tancuj-sama",
    "type": "album"
  },
  {
    "name": "Tango & Kou\u0159",
    "slug": "tango-kour",
    "type": "album"
  },
  {
    "name": "Tanz der Ewigkeit",
    "slug": "tanz-der-ewigkeit",
    "type": "album"
  },
  {
    "name": "Tarantino",
    "slug": "tarantino",
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
    "name": "Teorie p\xE1du",
    "slug": "teorie-padu",
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
    "name": "Teritorium Remixy",
    "slug": "teritorium-remixy",
    "type": "album"
  },
  {
    "name": "Tetris",
    "slug": "tetris",
    "type": "album"
  },
  {
    "name": "The Devil Is a Busy Man (Live)",
    "slug": "the-devil-is-a-busy-man-live",
    "type": "album"
  },
  {
    "name": "The Game",
    "slug": "the-game",
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
    "name": "Tik\xE1",
    "slug": "tika",
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
    "name": "Time",
    "slug": "time",
    "type": "album"
  },
  {
    "name": "Timeshift",
    "slug": "timeshift",
    "type": "album"
  },
  {
    "name": "To je vra\u017Eda, napsal",
    "slug": "to-je-vrazda-napsal",
    "type": "album"
  },
  {
    "name": "To Much Pain (feat. Nomad)",
    "slug": "to-much-pain-feat-nomad",
    "type": "album"
  },
  {
    "name": "ToJeVoNo",
    "slug": "tojevono",
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
    "name": "Tulips",
    "slug": "tulips",
    "type": "album"
  },
  {
    "name": "Ty jsi nula",
    "slug": "ty-jsi-nula",
    "type": "album"
  },
  {
    "name": "Ty si to v\u011Bd\u011Bla",
    "slug": "ty-si-to-vedela",
    "type": "album"
  },
  {
    "name": "Uber Black",
    "slug": "uber-black",
    "type": "album"
  },
  {
    "name": "Ultra! Ultra!",
    "slug": "ultra-ultra",
    "type": "album"
  },
  {
    "name": "Underdogs (feat. SamDitQuoi, Danjo, Filip Konvalinka)",
    "slug": "underdogs-feat-samditquoi-danjo-filip-konvalinka",
    "type": "album"
  },
  {
    "name": "\xDAsm\u011Bv",
    "slug": "usmev",
    "type": "album"
  },
  {
    "name": "USTAWIENIA FABRYCZNE (Miasto Prywatne 3) [feat. Zaywas, DJ Flip]",
    "slug": "ustawienia-fabryczne-miasto-prywatne-3-feat-zaywas-dj-flip",
    "type": "album"
  },
  {
    "name": "Utr\u017Een\xFD sluch\xE1tko / Puma",
    "slug": "utrzeny-sluchatko-puma",
    "type": "album"
  },
  {
    "name": "UZI",
    "slug": "uzi",
    "type": "album"
  },
  {
    "name": "\xDA\u017Easn\xE1 pou\u0165 ostrovem (feat. Mik\xFD\u0159)",
    "slug": "uzasna-pout-ostrovem-feat-mikyr",
    "type": "album"
  },
  {
    "name": "V\xA0hlavn\xED roli",
    "slug": "v-hlavni-roli",
    "type": "album"
  },
  {
    "name": "V jednom kole",
    "slug": "v-jednom-kole",
    "type": "album"
  },
  {
    "name": "VENKU",
    "slug": "venku",
    "type": "album"
  },
  {
    "name": "Vidim to, jako by to bylo v\u010Dera",
    "slug": "vidim-to-jako-by-to-bylo-vcera",
    "type": "album"
  },
  {
    "name": "V\xEDtej mezi n\xE1ma (NobodyListen Remix)",
    "slug": "vitej-mezi-nama-nobodylisten-remix",
    "type": "album"
  },
  {
    "name": "Volej Benga",
    "slug": "volej-benga",
    "type": "album"
  },
  {
    "name": "Vyhoviet\u030C",
    "slug": "vyhoviet",
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
    "name": "Wassup (feat. Pio Squad)",
    "slug": "wassup-feat-pio-squad",
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
    "name": "What A Feeling",
    "slug": "what-a-feeling",
    "type": "album"
  },
  {
    "name": "White Boy",
    "slug": "white-boy",
    "type": "album"
  },
  {
    "name": "Wiksa (feat. DJ Flip)",
    "slug": "wiksa-feat-dj-flip",
    "type": "album"
  },
  {
    "name": "Woah",
    "slug": "woah",
    "type": "album"
  },
  {
    "name": "Wygra\u0142em EP",
    "slug": "wygra-em-ep",
    "type": "album"
  },
  {
    "name": "You Don't Know",
    "slug": "you-don-t-know",
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
    "name": "Z fotky m\xFD m\xE1my kape krev",
    "slug": "z-fotky-my-mamy-kape-krev",
    "type": "album"
  },
  {
    "name": "ZACHYCENEJ V PASTI (feat. Lucie Bik\xE1rov\xE1 & Tom\xE1\u0161 Botl\xF3)",
    "slug": "zachycenej-v-pasti-feat-lucie-bikarova-tomas-botlo",
    "type": "album"
  },
  {
    "name": "Zdrhej (RMX)",
    "slug": "zdrhej-rmx",
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
    "name": "Zlatej Kluk",
    "slug": "zlatej-kluk",
    "type": "album"
  },
  {
    "name": "ZOO",
    "slug": "zoo",
    "type": "album"
  },
  {
    "name": "ZP\xC1TKY NA SVOJ\xCD PLANETU",
    "slug": "zpatky-na-svoji-planetu",
    "type": "album"
  },
  {
    "name": "Zp\xE1tky Ze Tmy",
    "slug": "zpatky-ze-tmy",
    "type": "album"
  },
  {
    "name": "Zrcadlo na zdi",
    "slug": "zrcadlo-na-zdi",
    "type": "album"
  },
  {
    "name": "Z\u016Fstal jsem sv\u016Fj",
    "slug": "zustal-jsem-svuj",
    "type": "album"
  },
  {
    "name": "\u017D\xE1dn\xE1 sl\xE1va",
    "slug": "zadna-slava",
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
      "Karel Ku\u010Dera"
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
    "type": "rapper"
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
      "Tengku Ariez Hazaril"
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
    "type": "rapper"
  },
  {
    "name": "AstralKid22 \u2013 pra\u017Eskej drill s du\u0161\xED",
    "slug": "astralkid22",
    "type": "rapper",
    "aliases": [
      "Neve\u0159ejn\xE9 (\xFAdajn\u011B n\u011Bco s \u201AK\u2018)"
    ]
  },
  {
    "name": "BADBOY BERLIN",
    "slug": "badboy-berlin",
    "type": "rapper"
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
      "Nezn\xE1m\xFD (\xFAdajn\u011B Keanu Johnson)"
    ]
  },
  {
    "name": "Big Narstie",
    "slug": "big-narstie",
    "type": "rapper",
    "aliases": [
      "Tyrone Mark Lindo"
    ]
  },
  {
    "name": "Blako",
    "slug": "blako",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xFD (\xFAdajn\u011B spojen\xFD s projektem *Rise of the Warrior Cop*)"
    ]
  },
  {
    "name": "Bobby Blaze",
    "slug": "bobby-blaze",
    "type": "rapper"
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
    "name": "Cashanova Bulhar",
    "slug": "cashanova-bulhar",
    "type": "rapper",
    "aliases": [
      "Mat\u011Bj Kratejl"
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
      "Nezn\xE1m\xFD (\xFAdajn\u011B spojen s projektem JMPZ)"
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
      "Daniel Kapit\xE1n"
    ]
  },
  {
    "name": "David Beng Rosta\u0161",
    "slug": "david-beng-rostas",
    "type": "rapper",
    "aliases": [
      "David Rosta\u0161"
    ]
  },
  {
    "name": "Decky",
    "slug": "decky",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xE9 (mo\u017En\xE1 D\u011Bck\xFD, Decky Ortega)"
    ]
  },
  {
    "name": "DEJV",
    "slug": "dejv",
    "type": "rapper",
    "aliases": [
      "David Smetana"
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
      "David Jekyll"
    ]
  },
  {
    "name": "DJ Fatte",
    "slug": "dj-fatte",
    "type": "rapper",
    "aliases": [
      "Martin Fatka"
    ]
  },
  {
    "name": "DJ Kadr",
    "slug": "dj-kadr",
    "type": "rapper",
    "aliases": [
      "Nezn\xE1m\xE9 (neve\u0159ejn\xE9)"
    ]
  },
  {
    "name": "Dj Opia",
    "slug": "dj-opia",
    "type": "rapper"
  },
  {
    "name": "DJ Wich",
    "slug": "dj-wich",
    "type": "rapper",
    "aliases": [
      "Tom\xE1\u0161 Pechl\xE1k"
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
      "Mathivendhan"
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
    "type": "rapper"
  },
  {
    "name": "Karlo",
    "slug": "karlo",
    "type": "rapper"
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
      "Libor Kv\xEDtek"
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
      "Luk\xE1\u0161 Lab\xEDk"
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
      "Luk\xE1\u0161 Loudil"
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
      "Samuel Chalupka"
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
//# sourceMappingURL=compiled-contentlayer-config-XOV4FSZL.mjs.map
