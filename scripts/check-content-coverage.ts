#!/usr/bin/env node
/**
 * check-content-coverage.ts — Analyzuje stav obsahu napříč artisty
 *
 * Usage: npx tsx scripts/check-content-coverage.ts
 */

import * as fs from "fs";
import * as path from "path";

const REPO = path.resolve(__dirname, "..");
const entitiesDir = path.join(REPO, "content", "entities");
const imagesDir = path.join(REPO, "public", "images", "artists");

interface ArtistStatus {
  slug: string;
  title: string;
  hasProfile: boolean;
  hasImage: boolean;
  hasMdx: boolean;
  hasRelations: boolean;
  profileFields: number;
  mdxLength: number;
}

function getArtistEntries(): string[] {
  return fs.readdirSync(entitiesDir).filter(e => e.startsWith("artist_"));
}

function analyze(): ArtistStatus[] {
  const entries = getArtistEntries();
  const results: ArtistStatus[] = [];

  for (const entry of entries) {
    const slug = entry.replace("artist_", "");
    const dir = path.join(entitiesDir, entry);

    // meta.json
    const metaPath = path.join(dir, "meta.json");
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf-8")) : {};
    const title = meta.title || slug;

    // profile.json
    const profilePath = path.join(dir, "profile.json");
    const hasProfile = fs.existsSync(profilePath);
    let profileFields = 0;
    if (hasProfile) {
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
      profileFields = Object.keys(profile).length;
    }

    // entity.mdx
    const mdxPath = path.join(dir, "entity.mdx");
    const hasMdx = fs.existsSync(mdxPath);
    const mdxLength = hasMdx ? fs.readFileSync(mdxPath, "utf-8").length : 0;

    // relations.json
    const relPath = path.join(dir, "relations.json");
    const hasRelations = fs.existsSync(relPath);

    // image
    const hasImage = fs.existsSync(path.join(imagesDir, `${slug}.webp`)) ||
                     fs.existsSync(path.join(imagesDir, `${slug}.jpg`)) ||
                     fs.existsSync(path.join(imagesDir, `${slug}.png`));

    results.push({ slug, title, hasProfile, hasImage, hasMdx, hasRelations, profileFields, mdxLength });
  }

  return results;
}

function main() {
  const results = analyze();
  const total = results.length;

  const withProfile = results.filter(r => r.hasProfile);
  const withImage = results.filter(r => r.hasImage);
  const withMdx = results.filter(r => r.hasMdx && r.mdxLength > 200);
  const withRelations = results.filter(r => r.hasRelations);
  const withBoth = results.filter(r => r.hasProfile && r.hasImage);

  console.log("═══════════════ CONTENT COVERAGE ═══════════════\n");

  console.log(`Total artists: ${total}`);
  console.log(`  ✅ With profile.json:  ${withProfile.length} (${(withProfile.length/total*100).toFixed(0)}%)`);
  console.log(`  ✅ With profile image: ${withImage.length} (${(withImage.length/total*100).toFixed(0)}%)`);
  console.log(`  ✅ With MDX content:   ${withMdx.length} (${(withMdx.length/total*100).toFixed(0)}%)`);
  console.log(`  ✅ With relations:      ${withRelations.length} (${(withRelations.length/total*100).toFixed(0)}%)`);
  console.log(`  ✅ Profile + Image:     ${withBoth.length} (${(withBoth.length/total*100).toFixed(0)}%)`);

  // Profile field distribution
  console.log("\n── Profile field distribution ──");
  const fieldCounts = withProfile.map(r => r.profileFields);
  const avg = fieldCounts.reduce((a, b) => a + b, 0) / fieldCounts.length;
  const min = Math.min(...fieldCounts);
  const max = Math.max(...fieldCounts);
  console.log(`  Fields per profile: avg=${avg.toFixed(0)}, min=${min}, max=${max}`);

  // Top artists by completeness
  console.log("\n── Top 20 most complete profiles ──");
  const sorted = [...results].sort((a, b) => {
    const scoreA = (a.hasProfile ? 1 : 0) + (a.hasImage ? 1 : 0) + (a.hasMdx && a.mdxLength > 200 ? 1 : 0) + (a.hasRelations ? 1 : 0);
    const scoreB = (b.hasProfile ? 1 : 0) + (b.hasImage ? 1 : 0) + (b.hasMdx && b.mdxLength > 200 ? 1 : 0) + (b.hasRelations ? 1 : 0);
    return scoreB - scoreA;
  });
  for (const r of sorted.slice(0, 20)) {
    const score = (r.hasProfile ? 1 : 0) + (r.hasImage ? 1 : 0) + (r.hasMdx && r.mdxLength > 200 ? 1 : 0) + (r.hasRelations ? 1 : 0);
    const icons = `${r.hasProfile ? "📄" : "⬜"}${r.hasImage ? "🖼" : "⬜"}${r.hasMdx && r.mdxLength > 200 ? "📝" : "⬜"}${r.hasRelations ? "🔗" : "⬜"}`;
    console.log(`  ${score}/4 ${icons} ${r.title} (${r.slug})`);
  }

  // Bottom artists
  console.log("\n── Bottom 20 (least complete) ──");
  for (const r of sorted.slice(-20).reverse()) {
    const score = (r.hasProfile ? 1 : 0) + (r.hasImage ? 1 : 0) + (r.hasMdx && r.mdxLength > 200 ? 1 : 0) + (r.hasRelations ? 1 : 0);
    const icons = `${r.hasProfile ? "📄" : "⬜"}${r.hasImage ? "🖼" : "⬜"}${r.hasMdx && r.mdxLength > 200 ? "📝" : "⬜"}${r.hasRelations ? "🔗" : "⬜"}`;
    console.log(`  ${score}/4 ${icons} ${r.title} (${r.slug})`);
  }

  // Artists with profile but no image
  const noImage = withProfile.filter(r => !r.hasImage);
  if (noImage.length > 0) {
    console.log(`\n── Artists with profile but NO image (${noImage.length}) ──`);
    for (const r of noImage) {
      console.log(`  ${r.title} (${r.slug})`);
    }
  }

  console.log("\n═══════════════ END ═══════════════");
}

main();
