import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  extractBody,
  realContentLength,
  mayOverwrite,
  MIN_KEEP_CHARS,
  KEEP_RICH_CHARS,
} from "./content-guard.js";

// ─── extractBody: dvojitý frontmatter (REGRESE 2026-10-11) ────────────────
test("extractBody zvládne dvojitý frontmatter (příčina přepsání žánrů)", () => {
  const raw = "---\n\n---\n\n---\ntitle: \"Drill\"\n---\n\nSkutečné tělo textu.\n";
  const body = extractBody(raw);
  assert.equal(body.trim(), "Skutečné tělo textu.");
});

test("extractBody zvládne jednoduchý frontmatter", () => {
  const raw = "---\ntitle: \"X\"\n---\n\nTělo.\n";
  assert.equal(extractBody(raw).trim(), "Tělo.");
});

test("extractBody zvládne CRLF (Windows line endings)", () => {
  const raw = "---\r\n\r\n---\r\n\r\n---\r\ntitle: \"X\"\r\n---\r\n\r\nTělo.\r\n";
  assert.equal(extractBody(raw).trim(), "Tělo.");
});

test("extractBody bez frontmatteru vrátí vše", () => {
  const raw = "Jen text bez frontmatteru.\n";
  assert.equal(extractBody(raw).trim(), "Jen text bez frontmatteru.");
});

// ─── realContentLength ─────────────────────────────────────────────────────
test("realContentLength ignoruje HTML komentář (případ smack-one)", () => {
  const raw = "---\ntitle: X\n---\n\n<!-- Stub entity created on 2026-06-12 -->\n\n" + "a".repeat(300);
  assert.equal(realContentLength(raw), 300);
});

test("realContentLength ignoruje nadpisy a citace", () => {
  const raw = "---\ntitle: X\n---\n\n# Nadpis\n\n> citace\n\n" + "b".repeat(250);
  assert.equal(realContentLength(raw), 250);
});

test("realContentLength spočítá prázdný soubor jako 0", () => {
  assert.equal(realContentLength("---\ntitle: X\n---\n\n# Jen nadpis\n"), 0);
});

// ─── mayOverwrite ──────────────────────────────────────────────────────────
function tmpEntities() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-"));
  return dir;
}

function writeEntity(dir: string, id: string, body: string) {
  const d = path.join(dir, id);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "entity.mdx"), `---\ntitle: X\n---\n\n${body}\n`);
}

test("mayOverwrite: prázdnou entitu povolí", () => {
  const dir = tmpEntities();
  writeEntity(dir, "e1", "# Nadpis\n");
  const d = mayOverwrite(dir, "e1");
  assert.equal(d.allowed, true);
  assert.equal(d.reason, "empty");
});

test("mayOverwrite: chybějící entitu povolí", () => {
  const d = mayOverwrite(tmpEntities(), "neexistuje");
  assert.equal(d.allowed, true);
});

test("mayOverwrite: BOHATÝ obsah ochrání i s FORCE (regrese)", () => {
  const dir = tmpEntities();
  writeEntity(dir, "rich", "x".repeat(KEEP_RICH_CHARS + 100));
  const d = mayOverwrite(dir, "rich", { force: true });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "too-rich");
});

test("mayOverwrite: bohatý obsah povolí jen s ALLOW_RICH + potvrzením", () => {
  const dir = tmpEntities();
  writeEntity(dir, "rich", "x".repeat(KEEP_RICH_CHARS + 100));
  assert.equal(mayOverwrite(dir, "rich", { allowRich: true }).allowed, false);
  assert.equal(mayOverwrite(dir, "rich", { allowRich: true, confirmed: true }).allowed, true);
});

test("mayOverwrite: střední obsah (200-600) nepovolí bez potvrzení", () => {
  const dir = tmpEntities();
  writeEntity(dir, "mid", "y".repeat(MIN_KEEP_CHARS + 50));
  const d = mayOverwrite(dir, "mid", { force: true });
  assert.equal(d.allowed, false);
  assert.equal(d.needsConfirmation, true);
});

test("mayOverwrite: střední obsah povolí s FORCE + potvrzením", () => {
  const dir = tmpEntities();
  writeEntity(dir, "mid", "y".repeat(MIN_KEEP_CHARS + 50));
  const d = mayOverwrite(dir, "mid", { force: true, confirmed: true });
  assert.equal(d.allowed, true);
});

test("REGRESE: žánr s ručním obsahem (dvojitý frontmatter) se NEPŘEPÍŠE", () => {
  const dir = tmpEntities();
  const g = path.join(dir, "genre_drill");
  fs.mkdirSync(g, { recursive: true });
  // Přesná struktura původního souboru, který byl přepsán
  fs.writeFileSync(
    path.join(g, "entity.mdx"),
    "---\n\n---\n\n---\r\ntitle: \"Drill\"\r\n---\r\n\r\n" + "Drill je subžánr hip-hopu. ".repeat(60),
  );
  const d = mayOverwrite(dir, "genre_drill");
  assert.equal(d.allowed, false, "ručně psaný žánr se nesmí přepsat");
  assert.ok(d.currentLength > KEEP_RICH_CHARS);
});
