#!/usr/bin/env -S npx tsx
/**
 * Fetch all RapMonitor songs and save to JSON for analysis.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const API_KEY = "b9d03638f3df4fe49ee5e75ab26d0803";
const API_URL = "https://rap-monitor.base44.app/api/entities/Song";
const OUTPUT = path.resolve(__dirname, "../.tmp/rapmonitor-all-songs.json");

async function fetchPage(limit: number, skip: number): Promise<any[]> {
  const url = `${API_URL}?limit=${limit}&skip=${skip}`;
  const res = await fetch(url, { headers: { api_key: API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Not an array");
  return data;
}

async function main() {
  const all: any[] = [];
  let skip = 0;
  const limit = 500;

  while (true) {
    console.log(`Fetching skip=${skip}...`);
    const page = await fetchPage(limit, skip);
    if (page.length === 0) break;
    all.push(...page);
    console.log(`  Got ${page.length} songs (total: ${all.length})`);
    if (page.length < limit) break;
    skip += limit;
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(all, null, 2));

  const complete = all.filter((s: any) => s.analysis_status === "complete");
  console.log(`\nTotal songs: ${all.length}`);
  console.log(`Complete: ${complete.length}`);
  console.log(`Saved to ${OUTPUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
