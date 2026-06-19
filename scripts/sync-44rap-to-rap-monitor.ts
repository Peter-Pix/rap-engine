/**
 * Sync 44rap data → Rap Monitor
 *
 * Fetches all rappers from 44rap.base44.app and creates/updates
 * corresponding Artist records in rap-monitor-copy.
 * Then syncs FreshReleases → Song records.
 *
 * Usage: npx tsx scripts/sync-44rap-to-rap-monitor.ts
 */

import { getRappers, getFreshReleases, Base44Rapper, Base44FreshRelease } from "../src/lib/api/44rap";
import {
  getArtists,
  getSongs,
  createArtist,
  updateArtist,
  createSong,
  RapMonitorArtist,
  RapMonitorSong,
} from "../src/lib/api/rap-monitor";

const BATCH_SIZE = 10;
const SLEEP_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Mapping ────────────────────────────────────────────────────────────────

function mapRapperToArtist(r: Base44Rapper): Partial<RapMonitorArtist> {
  const bioParts: string[] = [];
  if (r.short_intro) bioParts.push(r.short_intro);
  if (r.career_summary) bioParts.push(r.career_summary);
  if (r.influence) bioParts.push(`Vliv: ${r.influence}`);
  if (r.controversy) bioParts.push(`Kontroverze: ${r.controversy}`);

  const notesParts: string[] = [];
  if (r.real_name) notesParts.push(`Real name: ${r.real_name}`);
  if (r.birth_date) notesParts.push(`Born: ${r.birth_date}`);
  if (r.birth_place) notesParts.push(`Birth place: ${r.birth_place}`);
  if (r.city) notesParts.push(`City: ${r.city}`);
  if (r.country) notesParts.push(`Country: ${r.country}`);
  if (r.label) notesParts.push(`Label: ${r.label}`);
  if (r.active_since) notesParts.push(`Active since: ${r.active_since}`);
  if (r.superpower) notesParts.push(`Superpower: ${r.superpower}`);
  if (r.one_liner) notesParts.push(`One-liner: ${r.one_liner}`);
  if (r.generation_context) notesParts.push(`Generace: ${r.generation_context}`);
  if (r.style_tags?.length) notesParts.push(`Styly: ${r.style_tags.join(", ")}`);
  if (r.themes?.length) notesParts.push(`Témata: ${r.themes.join(", ")}`);
  if (r.fun_facts?.length) notesParts.push(`Zajímavosti: ${r.fun_facts.join("; ")}`);

  return {
    name: r.artist_name,
    aliases: r.real_name ? [r.real_name] : undefined,
    bio: bioParts.join("\n\n") || undefined,
    image_url: r.profile_image_url || undefined,
    verified: r.status === "published",
    notes: notesParts.join("\n") || undefined,
  };
}

function mapFreshReleaseToSong(r: Base44FreshRelease): Partial<RapMonitorSong> {
  return {
    title: r.title,
    artist_id: "", // We don't have the Rap Monitor artist ID yet
    artist_name: r.artist_name,
    featuring_names: r.featured_artists || undefined,
    album: r.release_type === "album" ? r.title : undefined,
    release_date: r.release_date || undefined,
    tags_genre: r.genres || undefined,
    ai_summary_short: r.why_notable || undefined,
    year: r.release_date ? new Date(r.release_date).getFullYear() : undefined,
    notes: `Fresh score: ${r.fresh_score}`,
  };
}

// ─── Sync Artists ──────────────────────────────────────────────────────────

async function syncArtists() {
  console.log("📡 Fetching rappers from 44rap...");
  const result = await getRappers({ limit: 200 });
  if (result.error) {
    console.error("❌ Failed to fetch rappers:", result.error);
    return;
  }
  const rappers = result.data ?? [];
  console.log(`   Found ${rappers.length} rappers`);

  // Get existing artists in Rap Monitor
  console.log("📡 Fetching existing artists from Rap Monitor...");
  const existingResult = await getArtists({ limit: 200 });
  if (existingResult.error) {
    console.error("❌ Failed to fetch existing artists:", existingResult.error);
    return;
  }
  const existing = existingResult.data ?? [];
  const existingByName = new Map(existing.map((a) => [a.name.toLowerCase(), a]));
  console.log(`   Found ${existing.length} existing artists`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rappers.length; i += BATCH_SIZE) {
    const batch = rappers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (rapper) => {
        const artistData = mapRapperToArtist(rapper);
        const key = rapper.artist_name.toLowerCase();
        const existingArtist = existingByName.get(key);

        if (existingArtist && existingArtist.id) {
          // Update if name matches
          const updateResult = await updateArtist(existingArtist.id, artistData);
          if (updateResult.error) {
            console.error(`   ❌ Update ${rapper.artist_name}: ${updateResult.error}`);
          } else {
            updated++;
          }
        } else if (existingArtist) {
          // Exists but no ID (shouldn't happen)
          console.warn(`   ⚠️  ${rapper.artist_name}: exists but no ID`);
          skipped++;
        } else {
          // Create new
          const createResult = await createArtist(artistData);
          if (createResult.error) {
            console.error(`   ❌ Create ${rapper.artist_name}: ${createResult.error}`);
          } else {
            created++;
          }
        }
      }),
    );

    if (i + BATCH_SIZE < rappers.length) {
      await sleep(SLEEP_MS);
    }
  }

  console.log(`\n✅ Artists sync complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${rappers.length}`);
}

// ─── Sync Songs ────────────────────────────────────────────────────────────

async function syncSongs() {
  console.log("\n📡 Fetching FreshReleases from 44rap...");
  const result = await getFreshReleases({ limit: 200 });
  if (result.error) {
    console.error("❌ Failed to fetch FreshReleases:", result.error);
    return;
  }
  const releases = result.data ?? [];
  console.log(`   Found ${releases.length} releases`);

  // Get existing songs in Rap Monitor
  console.log("📡 Fetching existing songs from Rap Monitor...");
  const existingResult = await getSongs({ limit: 200 });
  if (existingResult.error) {
    console.error("❌ Failed to fetch existing songs:", existingResult.error);
    return;
  }
  const existing = existingResult.data ?? [];
  const existingByKey = new Map(
    existing.map((s) => [`${s.title.toLowerCase()}|${s.artist_name.toLowerCase()}`, s]),
  );
  console.log(`   Found ${existing.length} existing songs`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < releases.length; i += BATCH_SIZE) {
    const batch = releases.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (release) => {
        const songData = mapFreshReleaseToSong(release);
        const key = `${release.title.toLowerCase()}|${release.artist_name.toLowerCase()}`;

        if (existingByKey.has(key)) {
          skipped++;
          return;
        }

        const createResult = await createSong(songData);
        if (createResult.error) {
          console.error(`   ❌ Create song "${release.title}" by ${release.artist_name}: ${createResult.error}`);
        } else {
          created++;
        }
      }),
    );

    if (i + BATCH_SIZE < releases.length) {
      await sleep(SLEEP_MS);
    }
  }

  console.log(`\n✅ Songs sync complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${releases.length}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Syncing 44rap → Rap Monitor\n");

  await syncArtists();
  await syncSongs();

  console.log("\n🎉 All done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
