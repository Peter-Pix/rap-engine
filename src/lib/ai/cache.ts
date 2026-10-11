// ═══════════════════════════════════════════════════════════════
// AI vrstva — cache odpovědí
//
// LLM volání jsou drahá a pomalá. Stejný (normalizovaný) dotaz
// → stejná odpověď z cache. Šetří náklady i latenci.
//
// In-memory LRU. V serverless prostředí se zahřeje za běhu;
// pro trvalou cache by se dalo přepnout na disk/SQLite.
// ═══════════════════════════════════════════════════════════════

import { normalizeText } from "./entity-resolver";
import type { AskResult } from "./types";

interface CacheEntry {
  result: AskResult;
  /** Kdy vyprší (ms epoch). */
  expiresAt: number;
  /** Naposledy použito (pro LRU). */
  usedAt: number;
}

export interface AskCacheOptions {
  /** Maximální počet záznamů. */
  max?: number;
  /** TTL v ms (default 24 h — obsah KG se mění zřídka). */
  ttlMs?: number;
}

export class AskCache {
  private entries = new Map<string, CacheEntry>();
  private max: number;
  private ttlMs: number;

  constructor(opts: AskCacheOptions = {}) {
    this.max = opts.max ?? 500;
    this.ttlMs = opts.ttlMs ?? 24 * 60 * 60 * 1000;
  }

  private key(question: string): string {
    return normalizeText(question);
  }

  get(question: string): AskResult | null {
    const k = this.key(question);
    const e = this.entries.get(k);
    if (!e) return null;
    if (Date.now() > e.expiresAt) {
      this.entries.delete(k);
      return null;
    }
    e.usedAt = Date.now();
    return e.result;
  }

  set(question: string, result: AskResult): void {
    const k = this.key(question);
    // LRU evikce při přetečení
    if (this.entries.size >= this.max && !this.entries.has(k)) {
      let oldestKey: string | null = null;
      let oldest = Infinity;
      for (const [key, e] of this.entries) {
        if (e.usedAt < oldest) { oldest = e.usedAt; oldestKey = key; }
      }
      if (oldestKey) this.entries.delete(oldestKey);
    }
    this.entries.set(k, { result, expiresAt: Date.now() + this.ttlMs, usedAt: Date.now() });
  }

  /** Statistiky pro monitoring. */
  stats(): { size: number; max: number } {
    return { size: this.entries.size, max: this.max };
  }

  clear(): void {
    this.entries.clear();
  }
}

// Modul-level singleton (přežije mezi requesty v jednom procesu).
export const askCache = new AskCache();
