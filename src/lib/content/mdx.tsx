import React from "react";

// ─── Strip frontmatter ────────────────────────────────────────────────────

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n?/;

function stripFrontmatter(mdx: string): string {
  return mdx.replace(FRONTMATTER_RE, "").trim();
}

// ─── Inline formatting ────────────────────────────────────────────────────

/**
 * Parse inline MDX formatting inside a single text span.
 * Supports: **bold**, *italic*, `code`, [links](url)
 */
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Combined pattern: links first (they contain `[`), then bold, italic, code,
  // and citation groups `*([link](url) · [link](url))*` for inline references.
  const re = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(?<!\*)\*((?:\[[^\]]+\]\([^)]+\)|[^*])+)\*(?!\*)|(`([^`]+)`)/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }

    if (match[1]) {
      // Check if this link is part of a citation group (wrapped in `*(...)`).
      // The preceding char in the source text is `(` and the closing `)` follows.
      // We detect this by looking back one char: if it's `(`, and forward
      // we find `)*` somewhere ahead, we're inside a citation.
      const before = text[match.index - 1];
      const isCitation = before === '(';

      if (isCitation) {
        parts.push(
          React.createElement(
            "a",
            { key: `c-${match.index}`, href: match[3], className: "text-zinc-500 hover:text-zinc-300 transition-colors" },
            match[2],
          ),
        );
      } else {
        parts.push(
          React.createElement(
            "a",
            { key: `l-${match.index}`, href: match[3], className: "text-[#60a5fa] hover:text-[#93c5fd] hover:underline" },
            match[2],
          ),
        );
      }
    } else if (match[4]) {
      // Bold
      parts.push(
        React.createElement("strong", { key: `b-${match.index}` }, match[5]),
      );
    } else if (match[6] !== undefined) {
      // Italic — could be a citation wrapper `*([link](url) · ...)*` or
      // plain emphasis. Detect by content shape: starts with `(` and ends with `)`.
      const content = match[6].trim();
      const isCitation = content.startsWith("(") && content.endsWith(")");
      if (isCitation) {
        // Render as a styled citation span (smaller, muted, with leading "— ").
        // Strip the wrapping parens; the inner content is already parsed for links.
        // Re-parse the inner content for links (without recursing into italic).
        const inner = content.slice(1, -1);
        const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
        const citationNodes: React.ReactNode[] = ["— "];
        let li = 0;
        let lm: RegExpExecArray | null;
        let lastLinkEnd = 0;
        while ((lm = linkRe.exec(inner)) !== null) {
          if (lm.index > lastLinkEnd) {
            // plain text + separator before the link
            citationNodes.push(inner.slice(lastLinkEnd, lm.index));
          }
          citationNodes.push(
            React.createElement(
              "a",
              { key: `cl-${match.index}-${li}`, href: lm[2], className: "text-zinc-500 hover:text-zinc-300 transition-colors" },
              lm[1],
            ),
          );
          li++;
          lastLinkEnd = lm.index + lm[0].length;
        }
        if (lastLinkEnd < inner.length) {
          citationNodes.push(inner.slice(lastLinkEnd));
        }
        parts.push(
          React.createElement(
            "span",
            { key: `cit-${match.index}`, className: "block mt-2 text-xs text-zinc-500 not-italic" },
            ...citationNodes,
          ),
        );
      } else {
        parts.push(
          React.createElement("em", { key: `i-${match.index}` }, content),
        );
      }
    } else if (match[8] !== undefined) {
      // Inline code
      parts.push(
        React.createElement(
          "code",
          { key: `c-${match.index}`, className: "bg-gray-100 px-1 rounded text-sm font-mono" },
          match[8],
        ),
      );
    }

    last = match.index + match[0].length;
  }

  // Trailing plain text
  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

// ─── Block-level rendering ────────────────────────────────────────────────

/**
 * Render raw MDX content into React elements.
 *
 * Handles:
 * - `# …` through `###### …` headings
 * - Blank-line separated paragraphs
 * - `- / * / +` unordered lists
 * - `1.` ordered lists
 * - `> …` blockquotes
 * - `---` horizontal rules
 * - Inline formatting (bold, italic, code, links)
 *
 * The result is a single `<React.Fragment>` of block-level elements.
 */
export function renderMdx(content: string): React.ReactNode {
  const raw = stripFrontmatter(content);
  if (!raw) return null;

  const lines = raw.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // Empty line — skip
    if (!t) {
      i++;
      continue;
    }

    // Heading
    const h = t.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      const level = h[1].length;
      blocks.push(
        React.createElement(`h${level}` as keyof React.JSX.IntrinsicElements, {
          key: blocks.length,
          className: headingClass(level),
        }, ...parseInline(h[2])),
      );
      i++;
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      blocks.push(React.createElement("hr", { key: blocks.length, className: "my-6 border-gray-200" }));
      i++;
      continue;
    }

    // Blockquote
    if (t.startsWith("> ")) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        qLines.push(lines[i].trim().slice(2));
        i++;
      }
      // Detect "callout" style blockquote: starts with [!NOTE], [!WARNING], etc.
      const firstQ = qLines[0]?.trim() ?? "";
      const calloutMatch = firstQ.match(/^\[!(NOTE|WARNING|TIP|IMPORTANT)\]\s*(.*)/i);
      if (calloutMatch) {
        const variant = calloutMatch[1].toLowerCase();
        const colors: Record<string, string> = {
          note: "border-zinc-700 bg-zinc-900/40 text-zinc-300",
          warning: "border-yellow-600/50 bg-yellow-950/20 text-yellow-100",
          tip: "border-green-600/50 bg-green-950/20 text-green-100",
          important: "border-[#e4ff1a]/50 bg-[#e4ff1a]/5 text-zinc-100",
        };
        const labels: Record<string, string> = {
          note: "Poznámka",
          warning: "Upozornění",
          tip: "Tip",
          important: "Důležité",
        };
        const rest = calloutMatch[2];
        const newQLines = [rest, ...qLines.slice(1)];
        blocks.push(
          React.createElement(
            "aside",
            { key: blocks.length, className: `my-6 border-l-4 rounded-r-md p-4 ${colors[variant] ?? colors.note}` },
            React.createElement("div", { className: "text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2" }, labels[variant] ?? variant),
            React.createElement("p", { className: "text-base leading-relaxed m-0 not-italic" }, ...parseInline(newQLines.join(" "))),
          ),
        );
        continue;
      }
      blocks.push(
        React.createElement(
          "blockquote",
          { key: blocks.length, className: "my-6 border-l-4 border-[#e4ff1a]/60 bg-[#e4ff1a]/5 pl-5 pr-4 py-3 italic text-zinc-200 text-lg leading-relaxed rounded-r-md" },
          React.createElement("p", { className: "m-0" }, ...parseInline(qLines.join(" "))),
        ),
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(t)) {
      const items: React.ReactNode[] = [];
      let li = 0;
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const txt = lines[i].trim().replace(/^[-*+]\s+/, "");
        items.push(
          React.createElement("li", { key: li, className: "ml-4 list-disc" }, ...parseInline(txt)),
        );
        li++;
        i++;
      }
      blocks.push(
        React.createElement("ul", { key: blocks.length, className: "my-3 space-y-1" }, ...items),
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
      const items: React.ReactNode[] = [];
      let li = 0;
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const txt = lines[i].trim().replace(/^\d+\.\s+/, "");
        items.push(
          React.createElement("li", { key: li, className: "ml-4 list-decimal" }, ...parseInline(txt)),
        );
        li++;
        i++;
      }
      blocks.push(
        React.createElement("ol", { key: blocks.length, className: "my-3 space-y-1" }, ...items),
      );
      continue;
    }

    // Paragraph — consume until blank line or next block-level token
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isBlockStart(lines[i].trim())
    ) {
      pLines.push(lines[i]);
      i++;
    }
    if (pLines.length > 0) {
      blocks.push(
        React.createElement(
          "p",
          { key: blocks.length, className: "my-2 leading-relaxed" },
          ...parseInline(pLines.join(" ")),
        ),
      );
    } else {
      i++;
    }
  }

  return React.createElement("div", { className: "prose max-w-none" }, ...blocks);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isBlockStart(line: string): boolean {
  return /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|-{3,}|\*{3,}|_{3,})/.test(line);
}

function headingClass(level: number): string {
  const map: Record<number, string> = {
    1: "text-3xl font-black tracking-tighter text-white mt-10 mb-5 leading-tight",
    2: "text-2xl font-bold tracking-tight text-white mt-10 mb-4 pb-2 border-b border-zinc-800 leading-tight",
    3: "text-lg font-semibold text-[#e4ff1a] mt-7 mb-3 leading-snug flex items-center gap-2",
    4: "text-base font-semibold text-zinc-100 mt-5 mb-2 leading-snug",
    5: "text-sm font-mono uppercase tracking-widest text-zinc-400 mt-4 mb-2",
    6: "text-xs font-mono uppercase tracking-widest text-zinc-500 mt-3 mb-1",
  };
  return map[level] ?? "";
}
