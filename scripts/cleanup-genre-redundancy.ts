import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = "content/entities";

const GENRE_CLEANUP_MAP: Record<string, { removeFromGenres: boolean; addStyles?: string[]; addMoods?: string[] }> = {
  "genre_dark-trap":       { removeFromGenres: true, addStyles: ["style_aggressive", "style_hardcore"], addMoods: ["mood_dark", "mood_raw"] },
  "genre_melodic-trap":    { removeFromGenres: true, addStyles: ["style_melodic"], addMoods: ["mood_emotional", "mood_club"] },
  "genre_experimental-trap": { removeFromGenres: true, addStyles: ["style_experimental"], addMoods: ["mood_abstract"] },
  "genre_cloud-rap":       { removeFromGenres: true, addStyles: ["style_experimental"], addMoods: ["mood_emotional", "mood_abstract"] },
  "genre_lo-fi-rap":       { removeFromGenres: true, addStyles: ["style_melodic"], addMoods: ["mood_abstract", "mood_emotional"] },
  "genre_phonk":           { removeFromGenres: true, addStyles: ["style_experimental"], addMoods: ["mood_dark"] },
  "genre_rage":            { removeFromGenres: true, addStyles: ["style_aggressive"], addMoods: ["mood_club", "mood_raw"] },
  "genre_rage-rap":        { removeFromGenres: true, addStyles: ["style_aggressive", "style_hardcore"], addMoods: ["mood_club", "mood_raw"] },
  "genre_pluggnb":         { removeFromGenres: true, addStyles: ["style_melodic"], addMoods: ["mood_club", "mood_emotional"] },
  "genre_street-rap":      { removeFromGenres: true, addStyles: ["style_street"], addMoods: ["mood_raw"] },
  "genre_conscious-rap":   { removeFromGenres: true, addStyles: ["style_conscious"], addMoods: ["mood_abstract"] },
  "genre_gangsta-rap":     { removeFromGenres: true, addStyles: ["style_street", "style_hardcore"], addMoods: ["mood_dark", "mood_raw"] },
  "genre_horrorcore":      { removeFromGenres: true, addStyles: ["style_hardcore", "style_experimental"], addMoods: ["mood_dark", "mood_raw"] },
  "genre_sad-rap":         { removeFromGenres: true, addStyles: ["style_melodic"], addMoods: ["mood_emotional", "mood_dark"] },
  "genre_party-rap":       { removeFromGenres: true, addStyles: ["style_melodic"], addMoods: ["mood_club"] },
  "genre_comedy-rap":      { removeFromGenres: true, addStyles: ["style_experimental"], addMoods: ["mood_club"] },
  "genre_political-rap":   { removeFromGenres: true, addStyles: ["style_conscious"], addMoods: ["mood_abstract", "mood_dark"] },
  "genre_emo-rap":         { removeFromGenres: true, addStyles: ["style_melodic"], addMoods: ["mood_emotional", "mood_dark"] },
  "genre_mumble-rap":      { removeFromGenres: true, addStyles: ["style_melodic", "style_experimental"], addMoods: ["mood_club", "mood_abstract"] },
  "genre_melodic-rap":     { removeFromGenres: true, addStyles: ["style_melodic"], addMoods: ["mood_emotional", "mood_club"] },
  "genre_lyrical-rap":     { removeFromGenres: true, addStyles: ["style_conscious"], addMoods: ["mood_abstract"] },
  "genre_freestyle-rap":   { removeFromGenres: true, addStyles: ["style_experimental"], addMoods: ["mood_raw"] },
  "genre_spoken-word":     { removeFromGenres: true, addStyles: ["style_conscious", "style_experimental"], addMoods: ["mood_abstract"] },
  "genre_battle-rap":      { removeFromGenres: true, addStyles: ["style_hardcore", "style_aggressive"], addMoods: ["mood_raw", "mood_dark"] },
  "genre_pop-rap":         { removeFromGenres: false, addStyles: ["style_melodic"], addMoods: ["mood_club", "mood_emotional"] },
  "genre_rap-metal":       { removeFromGenres: false, addStyles: ["style_aggressive", "style_hardcore"], addMoods: ["mood_dark", "mood_raw"] },
  "genre_trap-metal":      { removeFromGenres: false, addStyles: ["style_aggressive", "style_hardcore"], addMoods: ["mood_dark", "mood_raw"] },
  "genre_rock-rap":        { removeFromGenres: false, addStyles: ["style_aggressive"], addMoods: ["mood_dark", "mood_raw"] },
  "genre_punk-rap":        { removeFromGenres: false, addStyles: ["style_aggressive", "style_experimental"], addMoods: ["mood_dark", "mood_raw"] },
  "genre_electronic-rap":  { removeFromGenres: false, addStyles: ["style_experimental"], addMoods: ["mood_abstract", "mood_club"] },
  "genre_jazz-rap":        { removeFromGenres: false, addStyles: ["style_experimental"], addMoods: ["mood_abstract"] },
};

interface Relations {
  genres?: string[];
  styles?: string[];
  moods?: string[];
  [key: string]: unknown;
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

function cleanupArtistRelations() {
  const artistDirs = readdirSync(ROOT).filter((d) => d.startsWith("artist_"));
  let updated = 0;
  let totalGenresRemoved = 0;
  let totalStylesAdded = 0;
  let totalMoodsAdded = 0;

  for (const dir of artistDirs) {
    const relPath = join(ROOT, dir, "relations.json");
    let rels: Relations;
    try {
      rels = JSON.parse(readFileSync(relPath, "utf-8"));
    } catch {
      continue;
    }

    const genres = rels.genres || [];
    const styles = new Set(rels.styles || []);
    const moods = new Set(rels.moods || []);
    
    let changed = false;
    const newGenres: string[] = [];

    for (const g of genres) {
      const cleanup = GENRE_CLEANUP_MAP[g];
      if (cleanup?.removeFromGenres) {
        totalGenresRemoved++;
        changed = true;
        if (cleanup.addStyles) {
          for (const s of cleanup.addStyles) styles.add(s);
          totalStylesAdded += cleanup.addStyles.length;
        }
        if (cleanup.addMoods) {
          for (const m of cleanup.addMoods) moods.add(m);
          totalMoodsAdded += cleanup.addMoods.length;
        }
      } else {
        newGenres.push(g);
        if (cleanup?.addStyles) {
          for (const s of cleanup.addStyles) styles.add(s);
          changed = true;
        }
        if (cleanup?.addMoods) {
          for (const m of cleanup.addMoods) moods.add(m);
          changed = true;
        }
      }
    }

    if (changed) {
      rels.genres = dedupe(newGenres);
      rels.styles = dedupe([...styles]);
      rels.moods = dedupe([...moods]);
      writeFileSync(relPath, JSON.stringify(rels, null, 2) + "\n");
      updated++;
    }
  }

  console.log(`✅ Updated ${updated}/${artistDirs.length} artists`);
  console.log(`   Genres removed: ${totalGenresRemoved}`);
  console.log(`   Styles added: ${totalStylesAdded}`);
  console.log(`   Moods added: ${totalMoodsAdded}`);
}

cleanupArtistRelations();