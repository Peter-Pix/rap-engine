// ═══════════════════════════════════════════════════════════════
// AI vrstva — typy
//
// Návrhový princip: LLM je POSLEDNÍ vrstva, která nemůže nic vymyslet.
// Každé tvrzení musí být podložené entitou z našeho KG.
// ═══════════════════════════════════════════════════════════════

/** Entita, na kterou dotaz míří (rezolvovaná z textu). */
export interface ResolvedEntity {
  id: string;
  type: string;
  title: string;
  slug: string;
  /** Skóre shody (vyšší = jistější). */
  score: number;
  /** Jak byla nalezena — pro debug. */
  via: "exact" | "partial" | "alias";
}

/** Gate výsledek: můžeme odpovídat? */
export interface GateResult {
  /** true = data existují, jdeme do LLM. false = tvrdé odmítnutí. */
  proceed: boolean;
  /** Rezolvované entity z dotazu. */
  entities: ResolvedEntity[];
  /** Důvod odmítnutí (pokud !proceed). */
  reason?: string;
}

/** Ověřený kontext pro LLM — whitelist entit a faktů. */
export interface GroundingContext {
  /** Textový kontext (jen z whitelistu). */
  text: string;
  /** Hrany grafu (jen mezi whitelistovanými entitami). */
  edges: string;
  /** Deterministicky spočítané hodnoty (počty, kolaborace). */
  computed: string;
  /** Whitelist: ID entit, které LLM smí zmínit. */
  allowedIds: Set<string>;
  /** Whitelist: URL, které LLM smí použít. */
  allowedUrls: Set<string>;
}

/** Výsledek validace odpovědi. */
export interface ValidationResult {
  ok: boolean;
  /** Porušení — co LLM vymyslela. */
  violations: string[];
}

/** Finální odpověď. */
export interface AskResult {
  answer: string;
  /** Zdrojové entity (pro UI citace). */
  sources: { id: string; title: string; type: string; url: string }[];
  /** true = odpověď odmítnuta (data nejsou). */
  refused: boolean;
  /** false = odpověď neprošla validací. */
  verified: boolean;
  meta: {
    latencyMs: number;
    tokens?: number;
    model: string;
    /** Kolik pokusů bylo potřeba (retry při violation). */
    attempts: number;
  };
}
