import { getRappers } from "../src/lib/api/44rap";
import * as fs from 'fs';
import * as path from 'path';

const ENTITIES_DIR = path.resolve('content/entities');

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const result = await getRappers({ limit: 200 });
  const rappers = result.data ?? [];
  
  const notInRkg: {name: string, slug: string, activeSince?: string, label?: string, city?: string}[] = [];
  
  for (const r of rappers) {
    const slug = slugify(r.artist_name);
    const dir = path.join(ENTITIES_DIR, 'artist_' + slug);
    if (!fs.existsSync(dir)) {
      notInRkg.push({
        name: r.artist_name,
        slug,
        activeSince: r.active_since,
        label: r.label,
        city: r.city,
      });
    }
  }
  
  console.log('=== V 44rap, ale NE v RKG ===');
  console.log('Celkem: ' + notInRkg.length + '\n');
  for (const a of notInRkg) {
    console.log('  ' + a.name);
    console.log('     slug: ' + a.slug);
    if (a.activeSince) console.log('     activeSince: ' + a.activeSince);
    if (a.label) console.log('     label: ' + a.label);
    if (a.city) console.log('     city: ' + a.city);
    console.log();
  }
}

main().catch(console.error);
