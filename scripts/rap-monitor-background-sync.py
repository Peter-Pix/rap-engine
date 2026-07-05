#!/usr/bin/env python3
"""
RapMonitor Background Sync Task (PAUSED)

Stahuje songy z RapMonitor API a provádí AI analýzu pro skladby,
 které ji nemají (analysis_status != 'complete').
 
 STATUS: PAUSED at 2026-07-05 03:50
 
Použití:
  nohup python3 scripts/rap-monitor-background-sync.py > logs/rap-monitor-sync.log 2>&1 &

Autentizace: api_key header (už funguje pro oba endpointy)
"""

import json
import time
import os
import sys
from datetime import datetime

API_KEY = "***"
BASE_URL = "https://rap-monitor.base44.app/api"
OUTPUT_DIR = "/tmp/rapmonitor_background"
BATCH_SIZE = 50  # Počet songů k analýze za běh
SLEEP_BETWEEN_CALLS = 120  # 2 minuty mezi analyze voláními

os.makedirs(OUTPUT_DIR, exist_ok=True)

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def fetch_all_songs():
    """Stáhne všechny songy z Entity API."""
    all_songs = []
    for skip in [0, 500, 1000]:
        url = f"{BASE_URL}/entities/Song?limit=500&skip={skip}"
        log(f"Fetching songs skip={skip}...")
        try:
            import subprocess
            result = subprocess.run(
                ["curl", "-s", "-H", f"api_key: {API_KEY}", url],
                capture_output=True, text=True, timeout=30
            )
            data = json.loads(result.stdout)
            if isinstance(data, list):
                all_songs.extend(data)
                log(f"  Got {len(data)} songs")
            else:
                log(f"  Error: {data}")
        except Exception as e:
            log(f"  Exception: {e}")
    return all_songs

def analyze_song(song_id):
    """Zavolá apiAnalyze pro konkrétní song."""
    url = f"{BASE_URL}/functions/apiAnalyze"
    payload = json.dumps({"song_id": song_id})
    log(f"  Analyzing {song_id}...")
    try:
        import subprocess
        result = subprocess.run(
            ["curl", "-s", "--max-time", "180", "-X", "POST",
             "-H", "Content-Type: application/json",
             "-H", f"api_key: {API_KEY}",
             "-d", payload, url],
            capture_output=True, text=True, timeout=200
        )
        data = json.loads(result.stdout)
        if data.get("success"):
            log(f"  ✓ Analysis complete for {song_id}")
            return data
        else:
            log(f"  ✗ Error: {data.get('error', 'Unknown')}")
            return None
    except Exception as e:
        log(f"  ✗ Exception: {e}")
        return None

def save_results(songs):
    """Uloží všechny songy do JSON souboru."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = f"{OUTPUT_DIR}/songs_{timestamp}.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(songs, f, ensure_ascii=False, indent=2)
    log(f"Saved {len(songs)} songs to {filepath}")

def main():
    log("=" * 60)
    log("RapMonitor Background Sync Started")
    log("=" * 60)

    # 1. Stáhnout všechny songy
    log("Phase 1: Fetching all songs...")
    songs = fetch_all_songs()
    log(f"Total songs fetched: {len(songs)}")

    # 2. Identifikovat songy k analýze
    to_analyze = [s for s in songs if s.get("analysis_status") != "complete"]
    already_done = [s for s in songs if s.get("analysis_status") == "complete"]
    log(f"Already complete: {len(already_done)}")
    log(f"Need analysis: {len(to_analyze)}")

    # 3. Uložit aktuální stav
    save_results(songs)

    # 4. Analyzovat BATCH_SIZE songů
    batch = to_analyze[:BATCH_SIZE]
    log(f"Phase 2: Analyzing {len(batch)} songs...")

    analyzed_count = 0
    for song in batch:
        song_id = song["id"]
        result = analyze_song(song_id)
        if result and result.get("success"):
            analyzed_count += 1
            # Update song data in memory
            song.update(result.get("song", {}))
        time.sleep(SLEEP_BETWEEN_CALLS)

    log(f"Phase 2 complete: {analyzed_count}/{len(batch)} songs analyzed")

    # 5. Uložit aktualizovaná data
    save_results(songs)

    log("=" * 60)
    log("Background Sync Complete")
    log("=" * 60)

if __name__ == "__main__":
    main()
