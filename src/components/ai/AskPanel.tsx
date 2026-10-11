"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ENTITY_TYPE_COLORS, ENTITY_TYPE_LABELS } from "@/lib/search";
import type { EntityType } from "@/lib/content/constants";

// ═══════════════════════════════════════════════════════════════
// Ask panel — AI vrstva nad knowledge graph.
//
// Apple-style ⌘K overlay: glass panel, streaming odpovědi,
// citace entit, guided chips. Nula halucinací (viz /api/ask).
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

/** Guided otázky — to, co data reálně unesou. */
const SUGGESTIONS: { label: string; icon: string }[] = [
  { label: "S kým nejčastěji spolupracoval Yzomandias?", icon: "🤝" },
  { label: "Kolik skladeb má Viktor Sheen?", icon: "🎵" },
  { label: "Jaké žánry dělá Calin?", icon: "🎚️" },
  { label: "Odkud je Paulie Garand?", icon: "📍" },
];

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

/** Velmi lehký markdown render (bold + entity odkazy). Nic víc netřeba. */
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
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--re-accent)] underline decoration-dotted">
            {label}
          </a>
        ) : (
          <Link key={key++} href={href} className="text-[var(--re-accent)] underline decoration-dotted hover:text-[#e4a843]">
            {label}
          </Link>
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

export interface AskPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AskPanel({ open, onClose }: AskPanelProps) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Focus při otevření
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc zavře
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const submit = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || busy) return;
      setQuestion("");
      setBusy(true);
      const idx = turns.length;
      setTurns((prev) => [
        ...prev,
        { question: trimmed, answer: "", sources: [], refused: false, verified: true, streaming: true },
      ]);

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
          setTurns((prev) =>
            prev.map((t, i) =>
              i === idx
                ? { ...t, answer: err.error ?? "AI vrstva momentálně nedostupná.", streaming: false, verified: false }
                : t,
            ),
          );
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
                setTurns((prev) =>
                  prev.map((t, i) => (i === idx ? { ...t, answer: acc } : t)),
                );
              } else if (payload.done) {
                setTurns((prev) =>
                  prev.map((t, i) =>
                    i === idx
                      ? {
                          ...t,
                          answer: acc,
                          sources: payload.sources ?? [],
                          refused: !!payload.refused,
                          verified: payload.verified !== false,
                          streaming: false,
                          latencyMs: payload.meta?.latencyMs,
                        }
                      : t,
                  ),
                );
              }
            } catch {
              /* ignore malformed chunk */
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setTurns((prev) =>
            prev.map((t, i) =>
              i === idx ? { ...t, answer: "Spojení přerušeno.", streaming: false, verified: false } : t,
            ),
          );
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, turns.length],
  );

  if (!open) return null;

  return (
    <div className="ask-overlay fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[8vh] sm:pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Zeptej se databáze"
        className="ask-panel relative w-full max-w-2xl glass rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--re-border)]">
          <span className="text-[var(--re-accent)]"><IconSpark /></span>
          <span className="text-sm font-semibold text-white/90">Zeptej se databáze</span>
          <span className="ml-1 text-[11px] uppercase tracking-wider text-white/35 border border-[var(--re-border)] rounded px-1.5 py-0.5">
            AI
          </span>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            className="ml-auto text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <IconClose />
          </button>
        </div>

        {/* Historie */}
        <div ref={scrollRef} className="ask-scroll max-h-[52vh] overflow-y-auto px-5 py-4 space-y-5">
          {turns.length === 0 && (
            <div className="py-3">
              <p className="text-white/50 text-sm mb-4">
                Zeptej se na cokoliv z databáze — rappery, skladby, alba, spolupráce.
                Odpovídám <strong className="text-white/70">jen z ověřených dat</strong>, takže si nic nevymýšlím.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => submit(s.label)}
                    className="ask-chip glass glass-hover text-left px-3.5 py-2.5 rounded-xl text-[13px] text-white/75 hover:text-white transition-colors flex items-start gap-2.5"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="shrink-0 opacity-80">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className="space-y-3">
              {/* Uživatel */}
              <div className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-[13px] font-medium"
                  style={{ background: "var(--chat-user-bg)", color: "var(--chat-user-text)" }}
                >
                  {t.question}
                </div>
              </div>

              {/* Asistent */}
              <div className="flex gap-2.5">
                <span className="shrink-0 mt-0.5 text-[var(--re-accent)] opacity-70"><IconSpark /></span>
                <div className="min-w-0 flex-1">
                  {t.streaming && !t.answer ? (
                    <div className="flex items-center gap-1.5 py-1.5">
                      <span className="ask-dot" />
                      <span className="ask-dot" />
                      <span className="ask-dot" />
                      <span className="ml-1.5 text-[11px] text-white/35">hledám v databázi…</span>
                    </div>
                  ) : (
                    <div className="ask-answer text-[13.5px] leading-relaxed text-white/85 whitespace-pre-wrap">
                      {renderAnswer(t.answer)}
                      {t.streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[var(--re-accent)] align-middle animate-pulse" />}
                    </div>
                  )}

                  {/* Nerozpoznané / neověřené */}
                  {!t.streaming && !t.verified && (
                    <p className="mt-2 text-[11px] text-amber-400/70">
                      ⚠️ Odpověď neprošla ověřením — radši ji ber s rezervou.
                    </p>
                  )}

                  {/* Citace */}
                  {!t.streaming && t.sources.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-white/30 self-center mr-0.5">
                        Zdroje
                      </span>
                      {t.sources.map((s) => (
                        <Link
                          key={s.id}
                          href={s.url}
                          onClick={onClose}
                          className="inline-flex items-center gap-1 glass glass-hover px-2 py-1 rounded-lg text-[11px] text-white/70 hover:text-white transition-colors"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: ENTITY_TYPE_COLORS[s.type as EntityType] ?? "#888" }}
                          />
                          {s.title}
                          <span className="text-white/30">
                            {ENTITY_TYPE_LABELS[s.type as EntityType] ?? s.type}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {!t.streaming && t.latencyMs != null && (
                    <p className="mt-1.5 text-[11px] text-white/25">
                      {(t.latencyMs / 1000).toFixed(1)} s · ověřeno z {t.sources.length || "0"} entit
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(question);
          }}
          className="border-t border-[var(--re-border)] p-3.5"
        >
          <div className="ask-glow glass flex items-center gap-2 rounded-xl px-3.5 py-2.5 transition-all duration-300">
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Např.: S kým spolupracoval Viktor Sheen?"
              maxLength={300}
              disabled={busy}
              className="flex-1 bg-transparent text-[13.5px] text-white/90 placeholder:text-white/30 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !question.trim()}
              aria-label="Odeslat"
              className="shrink-0 p-1.5 rounded-lg text-[var(--re-accent)] hover:bg-[var(--re-accent)]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <IconSend />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/25 text-center">
            Odpovědi vychází jen z ověřených dat 4rap.cz · <Link href="/zeptej-se" onClick={onClose} className="hover:text-white/50 underline decoration-dotted">celá stránka</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
