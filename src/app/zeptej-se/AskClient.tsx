"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ENTITY_TYPE_COLORS, ENTITY_TYPE_LABELS } from "@/lib/search";
import type { EntityType } from "@/lib/content/constants";

// ═══════════════════════════════════════════════════════════════
// /ask — plná AI stránka nad knowledge graph.
// Streaming, citace entit, guided chips. Nula halucinací.
// ═══════════════════════════════════════════════════════════════

interface Source {
  id: string;
  title: string;
  type: string;
  url: string;
}

interface Turn {
  question: string;
  answer: string;
  sources: Source[];
  refused: boolean;
  verified: boolean;
  streaming: boolean;
  latencyMs?: number;
}

const SUGGESTIONS: { label: string; icon: string }[] = [
  { label: "Kdo má nejvíc skladeb v databázi?", icon: "🏆" },
  { label: "Kdo má nejvíc alb?", icon: "💿" },
  { label: "Kdo má nejvíc featů (hostování)?", icon: "🤝" },
  { label: "Který label má nejvíc alb?", icon: "🏷️" },
  { label: "Která lokalita má nejvíc interpretů?", icon: "📍" },
  { label: "Jaký je nejzastoupenější žánr?", icon: "🎚️" },
  { label: "Jaké je nejstarší album v databázi?", icon: "🕰️" },
  { label: "Jaké je nejnovější album?", icon: "✨" },
  { label: "Jaká je nejstarší skladba v databázi?", icon: "🎵" },
  { label: "Jaký byl nejproduktivnější rok?", icon: "📅" },
  { label: "S kým nejčastěji spolupracoval Yzomandias?", icon: "💬" },
  { label: "Odkud je Paulie Garand?", icon: "🗺️" },
];

function IconSpark({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function renderAnswer(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    const bold = token.match(/^\*\*([^*]+)\*\*$/);
    if (link) {
      const [, label, href] = link;
      parts.push(
        href.startsWith("http") ? (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--re-accent)] underline decoration-dotted">{label}</a>
        ) : (
          <Link key={key++} href={href} className="text-[var(--re-accent)] underline decoration-dotted hover:text-[#e4a843]">{label}</Link>
        ),
      );
    } else if (bold) {
      parts.push(<strong key={key++} className="text-white font-semibold">{bold[1]}</strong>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function AskClient() {
  // Indexy turnů, u kterých má uživatel rozbalené všechny zdroje.
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (turns.length) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [turns]);

  const submit = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || busy) return;
      setQuestion("");
      setBusy(true);
      const idx = turns.length;
      setTurns((prev) => [...prev, { question: trimmed, answer: "", sources: [], refused: false, verified: true, streaming: true }]);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed, stream: true }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          setTurns((prev) => prev.map((t, i) => (i === idx ? { ...t, answer: err.error ?? "AI vrstva nedostupná.", streaming: false, verified: false } : t)));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.token) {
                acc += payload.token;
                setTurns((prev) => prev.map((t, i) => (i === idx ? { ...t, answer: acc } : t)));
              } else if (payload.done) {
                setTurns((prev) => prev.map((t, i) =>
                  i === idx ? { ...t, answer: acc, sources: payload.sources ?? [], refused: !!payload.refused, verified: payload.verified !== false, streaming: false, latencyMs: payload.meta?.latencyMs } : t,
                ));
              }
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setTurns((prev) => prev.map((t, i) => (i === idx ? { ...t, answer: "Spojení přerušeno.", streaming: false, verified: false } : t)));
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, turns.length],
  );

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      {/* Hero pozadí — zlatý akcent soustředěný uprostřed, okraje čisté */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, var(--ai-glow), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 pt-12 pb-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full text-[11px] uppercase tracking-widest text-[var(--re-accent)] mb-4">
            <IconSpark className="w-3.5 h-3.5" />
            AI nad databází
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Zeptej se databáze
          </h1>
          <p className="text-sm text-white/50 max-w-lg mx-auto leading-relaxed">
            Odpovídám <strong className="text-white/75">jen z ověřených dat</strong> 4rap.cz —
            rappeři, skladby, alba, spolupráce. Když něco nemáme, řeknu to. Žádné vymyšlené odpovědi.
          </p>

          {/* Experimentální nálepka — jasně viditelná, ale ne křiklavá */}
          <div
            className="mt-6 mx-auto max-w-md rounded-xl border px-4 py-3 text-left"
            style={{
              background: "var(--badge-bg)",
              borderColor: "var(--badge-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span aria-hidden className="text-sm">🧪</span>
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--badge-text)" }}
              >
                Experimentální funkce
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-white/55">
              Tahle vrstva je <strong className="text-white/75">ve zkušebním provozu</strong>.
              Odpovědi čerpá výhradně z naší databáze, ale občas může zlobit — když něco
              nesedí, dej vědět. Na datech v databázi to nic nemění.
            </p>
          </div>
        </div>

        {/* Guided chips (jen dokud není historie) */}
        {turns.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2 mb-8">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => submit(s.label)}
                className="ask-chip glass glass-hover text-left px-4 py-3 rounded-xl text-[13px] text-white/75 hover:text-white transition-colors flex items-start gap-2.5"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <span className="shrink-0 opacity-80">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Historie */}
        {turns.length > 0 && (
          <div ref={scrollRef} className="space-y-6 mb-6">
            {turns.map((t, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium" style={{ background: "var(--chat-user-bg)", color: "var(--chat-user-text)" }}>
                    {t.question}
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="shrink-0 mt-1 text-[var(--re-accent)] opacity-70"><IconSpark /></span>
                  <div className="min-w-0 flex-1">
                    {t.streaming && !t.answer ? (
                      <div className="flex items-center gap-1.5 py-2">
                        <span className="ask-dot" /><span className="ask-dot" /><span className="ask-dot" />
                        <span className="ml-1.5 text-xs text-white/35">hledám v databázi…</span>
                      </div>
                    ) : (
                      <div className="ask-answer prose prose-invert max-w-none text-[15px] leading-relaxed whitespace-pre-wrap">
                        {renderAnswer(t.answer)}
                        {t.streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--re-accent)] align-middle animate-pulse" />}
                      </div>
                    )}
                    {!t.streaming && !t.verified && (
                      <p className="mt-2 text-xs text-amber-400/70">⚠️ Odpověď neprošla ověřením — ber ji s rezervou.</p>
                    )}
                    {!t.streaming && t.sources.length > 0 && (() => {
                      const COLLAPSE_LIMIT = 4;
                      const isExpanded = expandedSources.has(i);
                      const visible = isExpanded || t.sources.length <= COLLAPSE_LIMIT
                        ? t.sources
                        : t.sources.slice(0, COLLAPSE_LIMIT);
                      const hiddenCount = t.sources.length - visible.length;
                      return (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wider text-white/30 self-center mr-1">Zdroje</span>
                          {visible.map((s) => (
                            <Link key={s.id} href={s.url} className="inline-flex items-center gap-1.5 glass glass-hover px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:text-white transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ENTITY_TYPE_COLORS[s.type as EntityType] ?? "#888" }} />
                              {s.title}
                              <span className="text-white/30">{ENTITY_TYPE_LABELS[s.type as EntityType] ?? s.type}</span>
                            </Link>
                          ))}
                          {hiddenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedSources((prev) => new Set(prev).add(i))}
                              className="inline-flex items-center gap-1.5 glass glass-hover px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white transition-colors"
                            >
                              +{hiddenCount} dalších
                            </button>
                          )}
                          {isExpanded && t.sources.length > COLLAPSE_LIMIT && (
                            <button
                              type="button"
                              onClick={() => setExpandedSources((prev) => {
                                const next = new Set(prev);
                                next.delete(i);
                                return next;
                              })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white transition-colors"
                            >
                              Sbalit
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    {!t.streaming && t.latencyMs != null && (
                      <p className="mt-2 text-[11px] text-white/25">{(t.latencyMs / 1000).toFixed(1)} s · ověřeno z {t.sources.length || "0"} entit</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input — sticky na konci */}
        <form
          onSubmit={(e) => { e.preventDefault(); submit(question); }}
          className="sticky bottom-4"
        >
          <div className="ask-glow glass flex items-center gap-2 rounded-2xl px-4 py-3 transition-all duration-300 shadow-xl">
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Zeptej se na cokoliv…"
              maxLength={300}
              disabled={busy}
              className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/30 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !question.trim()}
              aria-label="Odeslat"
              className="shrink-0 p-2 rounded-xl text-[var(--re-accent)] hover:bg-[var(--re-accent)]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <IconSend />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/25 text-center">
            Odpovědi vychází jen z ověřených dat 4rap.cz · žádné halucinace
          </p>
        </form>
      </div>
    </div>
  );
}
