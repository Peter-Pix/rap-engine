"use client";

import type { Profile } from "@/lib/content/schemas";

interface ProfileSectionProps {
  profile: Record<string, unknown>;
}

// ─── Section wrapper ──────────────────────────────────────────────────────

function Section({ title, children, border = true }: { title: string; children: React.ReactNode; border?: boolean }) {
  return (
    <section className={`${border ? "mb-10 pb-10 border-b border-white/[0.06]" : "mb-10"}`}>
      <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Tag pills ────────────────────────────────────────────────────────────

function TagPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-block px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Key Albums ───────────────────────────────────────────────────────────

function KeyAlbums({ albums }: { albums: Array<{ title: string; year?: string; description?: string }> }) {
  return (
    <div className="space-y-4">
      {albums.map((album, i) => (
        <div key={i} className="border-l-2 border-[#c8962e]/40 pl-4">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-white">{album.title}</span>
            {album.year && (
              <span className="text-xs font-mono text-white/50">{album.year}</span>
            )}
          </div>
          {album.description && (
            <p className="mt-1 text-sm text-white/70 leading-relaxed">{album.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Fact cards ───────────────────────────────────────────────────────────

function FunFacts({ facts }: { facts: string[] }) {
  return (
    <div className="space-y-3">
      {(facts as string[]).map((fact, i) => (
        <div key={i} className="flex gap-3">
          <span className="flex-shrink-0 mt-0.5 text-sm text-[#c8962e]/60 font-mono">
            #{i + 1}
          </span>
          <p className="text-sm text-white/80 leading-relaxed">{fact}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Sources ──────────────────────────────────────────────────────────────

function Sources({ urls }: { urls: string[] }) {
  return (
    <div className="space-y-1.5">
      {(urls as string[]).map((url, i) => (
        <div key={i} className="text-xs">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-[#c8962e] transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-[#c8962e]/50"
          >
            {url}
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Confidence badge ─────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const color = score >= 90 ? "text-green-400" : score >= 70 ? "text-yellow-400" : "text-red-400";
  const label = score >= 90 ? "Vysoká" : score >= 70 ? "Střední" : "Nízká";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider ${color}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {label} ({Math.round(score)}%)
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export function ProfileSection({ profile }: ProfileSectionProps) {
  const p = profile as unknown as Profile;

  return (
    <>
      {/* ── Short Intro ───────────────────────────────────────────── */}
      {p.shortIntro && (
        <div className="mb-8 text-lg text-white/90 leading-relaxed border-l-4 border-[#c8962e]/50 pl-5 italic">
          <p>{p.shortIntro}</p>
        </div>
      )}

      {/* ── Stats Bar (confidence + scan date) ──────────────────────── */}
      {(p.photoConfidence !== undefined || p.scanDate) && (
        <div className="mb-8 flex flex-wrap gap-3 items-center text-[11px] font-mono uppercase tracking-widest text-white/40">
          {p.photoConfidence !== undefined && <ConfidenceBadge score={p.photoConfidence} />}
          {p.scanDate && <span>Scan: {p.scanDate}</span>}
        </div>
      )}

      {/* ── One-liner + Superpower ──────────────────────────────────── */}
      {p.oneLiner && (
        <Section title="Ve zkratce">
          <p className="text-base text-white/80 leading-relaxed">{p.oneLiner}</p>
          {p.superpower && (
            <div className="mt-3 flex items-start gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#c8962e]/60 mt-0.5 flex-shrink-0">
                ⚡ Superschopnost
              </span>
              <p className="text-sm text-white/70 leading-relaxed">{p.superpower}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── What Makes Unique ──────────────────────────────────────── */}
      {p.whatMakesUnique && (
        <Section title="V čem je unikátní">
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{p.whatMakesUnique}</p>
        </Section>
      )}

      {/* ── Career Summary ─────────────────────────────────────────── */}
      {p.careerSummary && (
        <Section title="Kariéra">
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{p.careerSummary}</p>
        </Section>
      )}

      {/* ── Influence ───────────────────────────────────────────────── */}
      {p.influence && (
        <Section title="Vliv na scénu">
          <p className="text-sm text-white/80 leading-relaxed">{p.influence}</p>
        </Section>
      )}

      {/* ── Controversy ─────────────────────────────────────────────── */}
      {p.controversy && (
        <Section title="Kontroverze a kritika">
          <p className="text-sm text-white/80 leading-relaxed">{p.controversy}</p>
        </Section>
      )}

      {/* ── Generation Context ───────────────────────────────────────── */}
      {p.generationContext && (
        <Section title="Generační kontext">
          <p className="text-sm text-white/80 leading-relaxed">{p.generationContext}</p>
        </Section>
      )}

      {/* ── Style Tags ──────────────────────────────────────────────── */}
      {p.styleTags && p.styleTags.length > 0 && (
        <Section title="Styly">
          <TagPills items={p.styleTags} />
        </Section>
      )}

      {/* ── Themes ──────────────────────────────────────────────────── */}
      {p.themes && p.themes.length > 0 && (
        <Section title="Témata">
          <TagPills items={p.themes} />
        </Section>
      )}

      {/* ── Key Albums ──────────────────────────────────────────────── */}
      {p.keyAlbums && p.keyAlbums.length > 0 && (
        <Section title="Zásadní alba">
          <KeyAlbums albums={p.keyAlbums as Array<{ title: string; year?: string; description?: string }>} />
        </Section>
      )}

      {/* ── Key Tracks ──────────────────────────────────────────────── */}
      {p.keyTracks && p.keyTracks.length > 0 && (
        <Section title="Klíčové skladby">
          <ul className="space-y-1.5">
            {(p.keyTracks as string[]).map((track, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                <span className="text-[#c8962e]/60 font-mono">{i + 1}.</span>
                {track}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Similar Artists ─────────────────────────────────────────── */}
      {p.similarArtists && p.similarArtists.length > 0 && (
        <Section title="Koho si pustit dál">
          <div className="flex flex-wrap gap-1.5">
            {(p.similarArtists as string[]).map((name, i) => (
              <span
                key={i}
                className="inline-block px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/80"
              >
                {name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Fun Facts ──────────────────────────────────────────────── */}
      {p.funFacts && p.funFacts.length > 0 && (
        <Section title="Víte, že…">
          <FunFacts facts={p.funFacts as string[]} />
        </Section>
      )}

      {/* ── Sources ────────────────────────────────────────────────── */}
      {p.sources && p.sources.length > 0 && (
        <Section title="Zdroje" border={false}>
          <Sources urls={p.sources as string[]} />
        </Section>
      )}
    </>
  );
}