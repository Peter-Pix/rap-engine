"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * FilterSheet — mobilní bottom-sheet pro filtry (iOS pattern).
 *
 * Proč: inline filter panel na mobilu zabere celou obrazovku a po výběru
 * filtru se nezavře — uživatel musí ručně scrollovat zpět nahoru k výsledkům.
 *
 * Řešení: vyjížděcí sheet zespoda (jako v iOS appkách / e-shopech) s:
 *   - grab-handle (vizuální affordance „chytni a zavři“)
 *   - sticky CTA „Zobrazit X výsledků“ (zavře sheet + rovnou ukáže dopad)
 *   - tlačítko „Zrušit filtry“ jen když jsou aktivní
 *   - Esc + backdrop click zavře
 *
 * Používá se POUZE na mobilu (`md:hidden`). Desktop má inline panel.
 */

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
}

export function FilterSheet({
  open,
  onClose,
  resultCount,
  activeCount,
  onClear,
  children,
}: FilterSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Esc zavře
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Zámek body scrollu, když je sheet otevřený
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] md:hidden" role="dialog" aria-modal="true" aria-label="Filtry">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Zavřít filtry"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[sheetFade_300ms_ease-out]"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] flex flex-col rounded-t-2xl border-t border-white/[0.1] bg-zinc-950 shadow-2xl shadow-black/60 animate-[sheetUp_300ms_cubic-bezier(0.32,0.72,0,1)]"
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <span className="text-sm font-semibold text-white">Filtry</span>
          {activeCount > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Zrušit vše
            </button>
          )}
        </div>

        {/* Scrollovatelný obsah filtrů */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>

        {/* Sticky CTA */}
        <div className="shrink-0 border-t border-white/[0.06] bg-zinc-950 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-full bg-[#c8962e] text-zinc-950 font-semibold text-sm transition-transform duration-200 active:scale-[0.98]"
          >
            Zobrazit {resultCount} {resultCount === 1 ? "výsledek" : resultCount < 5 ? "výsledky" : "výsledků"}
          </button>
        </div>
      </div>
    </div>
  );
}
