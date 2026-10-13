"use client";

import { useState } from "react";

export interface FeedbackFormProps {
  /** ID entity, ke které se nahlášení vztahuje (např. artist_ektor). */
  entityId?: string;
  /** Název entity pro předmět e-mailu. */
  entityTitle?: string;
  /** Cesta na webu (bez domény), např. /raperi/ektor. */
  entityUrl?: string;
}

type Kind = "chyba" | "doplneni" | "jine";
type State = "idle" | "sending" | "sent" | "error";

const KINDS: { id: Kind; label: string }[] = [
  { id: "chyba", label: "Chyba v datech" },
  { id: "doplneni", label: "Chybí / je neúplné" },
  { id: "jine", label: "Jiné" },
];

/**
 * Nahlášení chyby nebo návrhu na doplnění.
 *
 * Odesílá na /api/feedback → Resend → e-mail správce.
 * Pokud API není nakonfigurované (503), zobrazí fallback s přímým e-mailem.
 */
export default function FeedbackForm({
  entityId,
  entityTitle,
  entityUrl,
}: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("chyba");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message,
          email,
          website,
          entityId,
          entityTitle,
          entityUrl:
            entityUrl ??
            (typeof window !== "undefined" ? window.location.pathname : ""),
        }),
      });

      if (res.ok) {
        setState("sent");
        setMessage("");
        setEmail("");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Odeslání se nepovedlo.");
      setState("error");
    } catch {
      setError("Odeslání se nepovedlo. Zkontroluj připojení.");
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/45 hover:text-[#c8962e] border border-white/[0.08] hover:border-[#c8962e]/40 rounded px-3 py-2 transition-colors"
      >
        <span aria-hidden>⚑</span> Nahlásit chybu nebo doplnit
      </button>
    );
  }

  return (
    <div className="glass rounded-xl p-4 border border-white/[0.08]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/55">
          Nahlášení {entityTitle ? `— ${entityTitle}` : ""}
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-white/40 hover:text-white/80 text-lg leading-none px-1"
          aria-label="Zavřít"
        >
          ×
        </button>
      </div>

      {state === "sent" ? (
        <div className="text-sm text-emerald-400/90 py-3">
          Díky — nahlášení odešlo. Ozveme se, pokud bude potřeba něco doplnit.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
                  kind === k.id
                    ? "border-[#c8962e]/60 text-[#c8962e] bg-[#c8962e]/5"
                    : "border-white/[0.14] text-white/65 hover:text-white/85"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <textarea
            required
            minLength={3}
            maxLength={4000}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              kind === "chyba"
                ? "Co je špatně? (např. chybné datum alba, překlep, špatný interpret)"
                : "Co chybí nebo je neúplné?"
            }
            className="w-full text-sm bg-black/30 border border-white/[0.15] focus:border-[#c8962e]/60 rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 outline-none resize-y"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tvůj e-mail (nepovinné — když chceš odpověď)"
            className="w-full text-sm bg-black/30 border border-white/[0.15] focus:border-[#c8962e]/60 rounded-lg px-3 py-2 text-white/90 placeholder:text-white/40 outline-none"
          />

          {/* honeypot — skryté pro lidi, roboti vyplní */}
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {error && <p className="text-xs text-red-400/90">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={state === "sending"}
              className="text-xs font-mono uppercase tracking-wider bg-[#c8962e] text-black font-semibold rounded px-4 py-2 hover:bg-[#e8b455] disabled:opacity-50 transition-colors"
            >
              {state === "sending" ? "Odesílám…" : "Odeslat"}
            </button>
            <span className="text-[11px] text-white/50">
              {message.length}/4000
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
