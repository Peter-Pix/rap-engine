// ═══════════════════════════════════════════════════════════════
// AI vrstva — rate limit
//
// Chrání LLM endpoint před zneužitím a nekontrolovanými náklady.
// Token bucket per identita (IP).
// ═══════════════════════════════════════════════════════════════

interface Bucket {
  tokens: number;
  /** Kdy se bucket naposledy doplnil (ms epoch). */
  lastRefill: number;
}

export interface RateLimitOptions {
  /** Maximální počet tokenů (burst). */
  capacity?: number;
  /** Doplnění tokenů za sekundu. */
  refillPerSec?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Zbývající tokeny po tomto požadavku. */
  remaining: number;
  /** Za kolik sekund si může dovolit další (pokud !allowed). */
  retryAfterSec?: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private capacity: number;
  private refillPerSec: number;

  constructor(opts: RateLimitOptions = {}) {
    this.capacity = opts.capacity ?? 10;
    this.refillPerSec = opts.refillPerSec ?? 0.2; // 1 dotaz / 5 s trvale
  }

  /** Zkontroluj a spotřebuj token. */
  check(identity: string): RateLimitResult {
    const now = Date.now();
    let b = this.buckets.get(identity);
    if (!b) {
      b = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(identity, b);
    }
    // Doplnění
    const elapsedSec = (now - b.lastRefill) / 1000;
    b.tokens = Math.min(this.capacity, b.tokens + elapsedSec * this.refillPerSec);
    b.lastRefill = now;

    if (b.tokens < 1) {
      const need = 1 - b.tokens;
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(need / this.refillPerSec),
      };
    }
    b.tokens -= 1;
    return { allowed: true, remaining: Math.floor(b.tokens) };
  }

  /** Úklid starých bucketů (volat periodicky). */
  prune(maxAgeMs = 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (now - b.lastRefill > maxAgeMs) this.buckets.delete(k);
    }
  }

  stats(): { identities: number } {
    return { identities: this.buckets.size };
  }
}

/** Odvození identity z requestu (IP za proxy). */
export function identityFromRequest(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

// Singleton — 10 dotazů burst, pak 1 / 5 s.
export const askLimiter = new RateLimiter({ capacity: 10, refillPerSec: 0.2 });
