import { readEntities, readInbound } from "./src/lib/content/cache-reader";
import { runIndexationEngine } from "./src/lib/indexation";

const entities = readEntities();
const inbound = readInbound();
if (!entities || !inbound) {
  console.log("Cache not built");
  process.exit(1);
}

const result = runIndexationEngine(entities, inbound);

console.log('=== DATA PRŮZKUM: CO POTŘEBUJE OBDOHATIT ===\n');

// 1. Artisti bez obrázku
console.log('=== 1. ARTISTI BEZ OBRÁZKU ===');
const artistsNoImg = result.scored
  .filter(s => s.entity.type === 'artist' && !s.signals.hasImage)
  .sort((a,b) => b.seoScore - a.seoScore);
console.log(`Celkem: ${artistsNoImg.length} artistů\n`);
for (const s of artistsNoImg.slice(0,20)) {
  console.log(`  ${s.entity.title.padEnd(25)} | score: ${s.seoScore}`);
}

// 2. Entity bez description
console.log('\n=== 2. ENTITY S PRAZDNÝM POPISKY ===');
const noDesc = result.scored
  .filter(s => s.signals.descriptionLength < 20 && s.entity.type !== 'track')
  .sort((a,b) => b.seoScore - a.seoScore);
console.log(`Celkem: ${noDesc.length} entit\n`);
for (const s of noDesc.slice(0,20)) {
  console.log(`  ${s.entity.type.padEnd(12)} | ${s.entity.title.substring(0,30).padEnd(30)} | desc: ${s.signals.descriptionLength} chars`);
}

// 3. DRAFT entity
console.log('\n=== 3. DRAFT ENTITY (nejvyšší potenciál) ===');
const draftHigh = result.scored
  .filter(s => s.state === 'DRAFT')
  .sort((a,b) => b.seoScore - a.seoScore);
console.log(`Celkem: ${draftHigh.length} draftů\n`);
for (const s of draftHigh.slice(0,20)) {
  console.log(`  ${s.entity.type.padEnd(12)} | ${s.entity.title.substring(0,30).padEnd(30)} | score: ${s.seoScore}`);
}

// 4. CANDIDATE → INDEXABLE
console.log('\n=== 4. CANDIDATE → INDEXABLE (score 35-39) ===');
const nearIndexable = result.scored
  .filter(s => s.state === 'CANDIDATE' && s.seoScore >= 35)
  .sort((a,b) => b.seoScore - a.seoScore);
console.log(`Celkem: ${nearIndexable.length} entit\n`);
for (const s of nearIndexable.slice(0,20)) {
  const missing = [
    !s.signals.hasImage ? 'img' : '',
    s.signals.descriptionLength < 50 ? 'desc' : '',
    s.signals.relationCount < 3 ? 'rels' : '',
    s.signals.contentLength < 500 ? 'content' : ''
  ].filter(Boolean).join(', ') || 'nic zásadního';
  console.log(`  ${s.entity.type.padEnd(12)} | ${s.entity.title.substring(0,30).padEnd(30)} | score: ${s.seoScore} | chybí: ${missing}`);
}

// 5. Alba bez coveru
console.log('\n=== 5. ALBA BEZ COVERU ===');
const albumsNoCover = result.scored
  .filter(s => s.entity.type === 'album' && !s.signals.hasImage)
  .sort((a,b) => b.seoScore - a.seoScore);
console.log(`Celkem: ${albumsNoCover.length} alb\n`);
for (const s of albumsNoCover.slice(0,20)) {
  console.log(`  ${s.entity.title.substring(0,35).padEnd(35)} | score: ${s.seoScore}`);
}

// 6. Entity bez vazeb
console.log('\n=== 6. ENTITY BEZ VAZEB (osamocené) ===');
const orphaned = result.scored
  .filter(s => s.signals.relationCount === 0 && s.entity.type !== 'track')
  .sort((a,b) => a.entity.type.localeCompare(b.entity.type));
console.log(`Celkem: ${orphaned.length} entit\n`);
for (const s of orphaned.slice(0,20)) {
  console.log(`  ${s.entity.type.padEnd(12)} | ${s.entity.title.substring(0,30).padEnd(30)}`);
}

// 7. Nejvyšší backlinky
console.log('\n=== 7. NEJVÍC PROPOJENÉ ENTITY ===');
const topLinked = result.scored
  .filter(s => s.signals.backlinkCount > 5)
  .sort((a,b) => b.signals.backlinkCount - a.signals.backlinkCount);
console.log(`Celkem >5 backlinks: ${topLinked.length} entit\n`);
for (const s of topLinked.slice(0,20)) {
  console.log(`  ${s.entity.type.padEnd(12)} | ${s.entity.title.substring(0,30).padEnd(30)} | backlinks: ${s.signals.backlinkCount}`);
}

// 8. Lokace bez umělců
console.log('\n=== 8. LOKACE BEZ PŘIŘAZENÝCH UMĚLCŮ ===');
const locs = result.scored.filter(s => s.entity.type === 'location');
const locsNoArtists = locs.filter(l => {
  const outbound = l.entity.outbound || {};
  const artists = outbound['HAS_ARTIST'] || [];
  return artists.length === 0;
});
console.log(`Celkem: ${locsNoArtists.length}/${locs.length} lokací\n`);
for (const s of locsNoArtists) {
  console.log(`  ${s.entity.title.padEnd(20)} | score: ${s.seoScore}`);
}

// 9. Labele bez umělců
console.log('\n=== 9. LABELE BEZ PŘIŘAZENÝCH UMĚLCŮ ===');
const labels = result.scored.filter(s => s.entity.type === 'label');
const labelsNoArtists = labels.filter(l => {
  const inboundList = inbound[l.entity.id] || [];
  return inboundList.length === 0;
});
console.log(`Celkem: ${labelsNoArtists.length}/${labels.length} labelů\n`);
for (const s of labelsNoArtists.slice(0,15)) {
  console.log(`  ${s.entity.title.padEnd(25)} | score: ${s.seoScore}`);
}

// 10. Taxonomie bez popisu
console.log('\n=== 10. TAXONOMIE BEZ POPISU ===');
const taxonomyNoDesc = result.scored
  .filter(s => ['genre','style','mood','theme'].includes(s.entity.type) && s.signals.descriptionLength < 50)
  .sort((a,b) => a.entity.type.localeCompare(b.entity.type));
console.log(`Celkem: ${taxonomyNoDesc.length} entit\n`);
for (const s of taxonomyNoDesc.slice(0,20)) {
  console.log(`  ${s.entity.type.padEnd(8)} | ${s.entity.title.substring(0,30).padEnd(30)} | desc: ${s.signals.descriptionLength}`);
}

// 11. INDEXABLE → AUTHORITATIVE gap
console.log('\n=== 11. INDEXABLE → AUTHORITATIVE (score 60-69) ===');
const nearAuth = result.scored
  .filter(s => s.state === 'INDEXABLE' && s.seoScore >= 60)
  .sort((a,b) => b.seoScore - a.seoScore);
console.log(`Celkem: ${nearAuth.length} entit\n`);
for (const s of nearAuth.slice(0,20)) {
  const missing = [
    !s.signals.hasImage ? 'img' : '',
    s.signals.descriptionLength < 100 ? 'desc' : '',
    s.signals.relationCount < 5 ? 'rels' : '',
    s.signals.contentLength < 1000 ? 'content' : '',
    s.signals.profileCompleteness < 30 ? 'profile' : ''
  ].filter(Boolean).join(', ') || 'nic zásadního';
  console.log(`  ${s.entity.type.padEnd(12)} | ${s.entity.title.substring(0,30).padEnd(30)} | score: ${s.seoScore} | chybí: ${missing}`);
}
