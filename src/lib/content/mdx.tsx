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
  // Combined pattern: links first (they contain `[`), then bold, italic, code
  const re = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(?<!\*)\*([^*]+)\*(?!\*)|(`([^`]+)`)/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }

    if (match[1]) {
      // Link
      parts.push(
        React.createElement(
          "a",
          { key: `l-${match.index}`, href: match[3], className: "text-[#60a5fa] hover:text-[#93c5fd] hover:underline" },
          match[2],
        ),
      );
    } else if (match[4]) {
      // Bold
      parts.push(
        React.createElement("strong", { key: `b-${match.index}` }, match[5]),
      );
    } else if (match[6]) {
      // Italic
      parts.push(
        React.createElement("em", { key: `i-${match.index}` }, match[6]),
      );
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
          key: i,
          className: headingClass(level),
        }, ...parseInline(h[2])),
      );
      i++;
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      blocks.push(React.createElement("hr", { key: i, className: "my-6 border-gray-200" }));
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
      blocks.push(
        React.createElement(
          "blockquote",
          { key: i, className: "border-l-4 border-gray-300 pl-4 italic text-gray-600" },
          React.createElement("p", null, ...parseInline(qLines.join(" "))),
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
        React.createElement("ul", { key: i, className: "my-3 space-y-1" }, ...items),
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
        React.createElement("ol", { key: i, className: "my-3 space-y-1" }, ...items),
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
          { key: i, className: "my-2 leading-relaxed" },
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
    1: "text-3xl font-bold mt-8 mb-4",
    2: "text-2xl font-semibold mt-6 mb-3",
    3: "text-xl font-semibold mt-5 mb-2",
    4: "text-lg font-medium mt-4 mb-2",
    5: "text-base font-medium mt-3 mb-1",
    6: "text-sm font-medium mt-3 mb-1",
  };
  return map[level] ?? "";
}
