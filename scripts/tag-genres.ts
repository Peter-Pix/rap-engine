import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = "content/entities";

/**
 * Tag mapping for genre entities.
 * Categories: primary | production | vocal | thematic | fusion | regional | related | period
 */
const TAG_MAP: Record<string, string[]> = {
  // PRIMARY (core rap genres)
  "genre_hip-hop": ["primary"],
  "genre_rap": ["primary"],
  "genre_trap": ["primary"],
  "genre_drill": ["primary"],
  "genre_boom-bap": ["primary"],
  "genre_grime": ["primary"],
  "genre_cloud-rap": ["primary", "atmospheric"],
  "genre_pop-rap": ["primary", "fusion"],
  "genre_underground-rap": ["primary"],
  "genre_underground-hip-hop": ["primary"],
  "genre_mainstream-rap": ["primary"],
  "genre_modern-rap": ["primary"],
  "genre_old-school-rap": ["primary"],
  "genre_newschool-rap": ["primary"],
  "genre_trueschool-rap": ["primary"],
  "genre_memphis-rap": ["primary", "regional"],
  "genre_east-coast-rap": ["primary", "regional"],
  "genre_southern-rap": ["primary", "regional"],
  "genre_west-coast-rap": ["primary", "regional"],
  "genre_uk-rap": ["primary", "regional"],
  "genre_road-rap": ["primary", "regional"],
  "genre_czech-rap": ["primary", "regional"],
  "genre_slovak-rap": ["primary", "regional"],
  "genre_britsky-hip-hop": ["primary", "regional"],
  "genre_afro-rap": ["primary", "fusion"],
  "genre_oriental-rap": ["primary", "fusion"],
  "genre_latin-trap": ["primary", "fusion"],

  // PRODUCTION / ZVUKOVÉ STYLY
  "genre_dark-trap": ["production", "subgenre"],
  "genre_melodic-trap": ["production", "subgenre"],
  "genre_experimental-trap": ["production", "subgenre"],
  "genre_lo-fi-rap": ["production"],
  "genre_phonk": ["production"],
  "genre_rage": ["production"],
  "genre_rage-rap": ["production"],
  "genre_pluggnb": ["production"],
  "genre_dubstep": ["production"],
  "genre_glitch-hop": ["production"],
  "genre_bass-music": ["production"],
  "genre_bassline": ["production"],
  "genre_sample-based": ["production"],
  "genre_electro": ["production"],
  "genre_electronic": ["production"],

  // VOCAL / FLOW STYLY
  "genre_mumble-rap": ["vocal"],
  "genre_melodic-rap": ["vocal"],
  "genre_lyrical-rap": ["vocal"],
  "genre_freestyle-rap": ["vocal"],
  "genre_spoken-word": ["vocal"],
  "genre_battle-rap": ["vocal"],
  "genre_chopper-rap": ["vocal"],

  // THEMATICKÉ SMĚRY
  "genre_conscious-rap": ["thematic"],
  "genre_political-rap": ["thematic"],
  "genre_gangsta-rap": ["thematic"],
  "genre_mafioso-rap": ["thematic"],
  "genre_street-rap": ["thematic"],
  "genre_horrorcore": ["thematic"],
  "genre_sad-rap": ["thematic"],
  "genre_party-rap": ["thematic"],
  "genre_comedy-rap": ["thematic"],
  "genre_shock-rap": ["thematic"],
  "genre_pornorap": ["thematic"],
  "genre_diss": ["thematic"],
  "genre_social-commentary": ["thematic"],
  "genre_spiritual-rap": ["thematic"],
  "genre_mystical-rap": ["thematic"],
  "genre_mythological-rap": ["thematic"],
  "genre_meditation-rap": ["thematic"],
  "genre_dark-rap": ["thematic"],

  // FUSION / CROSSOVER
  "genre_rap-metal": ["fusion"],
  "genre_trap-metal": ["fusion"],
  "genre_rock-rap": ["fusion"],
  "genre_punk-rap": ["fusion"],
  "genre_electronic-rap": ["fusion"],
  "genre_house-rap": ["fusion"],
  "genre_jazz-rap": ["fusion"],
  "genre_psychedelic-rap": ["fusion"],
  "genre_country-rap": ["fusion"],
  "genre_nu-metal": ["fusion"],
  "genre_dance-rap": ["fusion"],
  "genre_club-rap": ["fusion"],
  "genre_rap-rock": ["fusion"],

  // ALTERNATIVNÍ / EXPERIMENTÁLNÍ
  "genre_alternative-hip-hop": ["primary"],
  "genre_alternative-rap": ["primary"],
  "genre_experimental-hip-hop": ["primary"],
  "genre_experimental-rap": ["primary"],
  "genre_abstract-hip-hop": ["primary"],
  "genre_ambient-rap": ["primary"],
  "genre_art-rap": ["primary"],
  "genre_conceptual-rap": ["primary"],
  "genre_academic-rap": ["primary"],
  "genre_comic-book-rap": ["primary"],
  "genre_theater-rap": ["primary"],
  "genre_new-wave": ["primary"],
  "genre_indie-rap": ["primary"],

  // REGIONÁLNÍ / SCÉNOVÉ
  "genre_crunk": ["regional"],
  "genre_hyphy": ["regional"],
  "genre_bounce": ["regional"],
  "genre_garage-punk": ["related"],
  "genre_hardcore-punk": ["related"],
  "genre_political-punk": ["related"],
  "genre_punk": ["related"],
  "genre_hardcore-rap": ["primary"],

  // PŘÍBUZNÉ ŽÁNRY (non-rap)
  "genre_rnb": ["related"],
  "genre_r-n-b": ["related"],
  "genre_neo-soul": ["related"],
  "genre_soul": ["related"],
  "genre_funk": ["related"],
  "genre_pop": ["related"],
  "genre_czech-pop": ["related"],
  "genre_indie-pop": ["related"],
  "genre_pop-rock": ["related"],
  "genre_dancehall": ["related"],
  "genre_reggaeton": ["related"],
  "genre_afrobeats": ["related"],
  "genre_world-music": ["related"],
  "genre_world": ["related"],
  "genre_drum-and-bass": ["related"],
  "genre_drum-and-bass-mc": ["related"],
  "genre_jungle-mc": ["related"],
  "genre_uk-garage": ["related"],
  "genre_turntablism": ["related"],

  // SPECIFICKÉ / MÁLO ČASTÉ
  "genre_golden-era": ["period"],
  "genre_old-school-cz": ["period", "regional"],
  "genre_hip-hop-production": ["production"],
  "genre_emo-rap": ["thematic", "vocal"],
  "genre_gothic-rap": ["thematic"],
  "genre_poetry-slam": ["vocal", "thematic"],
};

function tagGenres() {
  const dirs = readdirSync(ROOT).filter((d) => d.startsWith("genre_"));
  let updated = 0;

  for (const dir of dirs) {
    const metaPath = join(ROOT, dir, "meta.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const id = meta.id as string;

    const tags = TAG_MAP[id];
    if (tags) {
      meta.tags = tags;
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
      updated++;
      console.log(`Tagged: ${id} → [${tags.join(", ")}]`);
    } else {
      console.log(`⚠️  Untagged: ${id}`);
    }
  }

  console.log(`\n✅ Updated ${updated}/${dirs.length} genre entities with tags.`);
}

tagGenres();
