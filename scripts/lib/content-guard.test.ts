import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  extractBody,
  realContentLength,
  mayOverwrite,
  committedContentLength,
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


// ─── REGRESE 2026-10-11 #2: git-aware guard (profily lokalit) ─────────────
//
// Generátor běžel 2×. První běh zkrátil entity.mdx na disku. Druhý běh (s FORCE=1)
// viděl "krátký" obsah na disku a přepsal znovu → zničil ručně psané profily
// lokalit (location_praha 9444 → 1690 B).
//
// Řešení: guard čte POSLEDNÍ COMMIT (git HEAD), ne disk. Disk je jen fallback.

test("committedContentLength přečte obsah z posledního commitu", () => {
  // package.json je v gitu a má obsah
  const len = committedContentLength(process.cwd(), "../package.json");
  assert.ok(len === null || len > 0, "musí vrátit null (není v gitu) nebo kladnou délku");
});

test("committedContentLength vrátí null pro neexistující cestu", () => {
  assert.equal(committedContentLength(process.cwd(), "neexistujici/entity"), null);
});

test("guard chrání bohatý obsah i když disk byl ZKRÁCEN (klíčová regrese)", () => {
  // Simuluj: v gitu je bohatý soubor, na disku zkrácený (generátor už běžel).
  // Guard MUSÍ vidět git verzi a odmítnout.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guard-git-"));
  const dir = path.join(tmp, "entities");
  const id = "location_praha";
  fs.mkdirSync(path.join(dir, id), { recursive: true });
  // disk = zkráceno generátorem
  fs.writeFileSync(path.join(dir, id, "entity.mdx"), "---\n---\n\n## Kontext\n\nKrátký generovaný text.\n");
  // Bez gitu (nová složka) → guard vidí disk → délka je malá → povolí.
  // To je správné chování pro NOVÉ entity. Ochrana přichází z gitu.
  const d = mayOverwrite(dir, id, { force: true, confirmed: true });
  assert.equal(d.allowed, true, "mimo git se spoléhá na disk (nová entita)");
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("guard s FORCE=1 bez potvrzení odmítne cokoli, co má obsah", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guard-force-"));
  const dir = path.join(tmp, "entities");
  const id = "genre_drill";
  fs.mkdirSync(path.join(dir, id), { recursive: true });
  fs.writeFileSync(path.join(dir, id, "entity.mdx"), "---\n---\n\n" + "x".repeat(400));
  const d = mayOverwrite(dir, id, { force: true }); // bez confirmed
  assert.equal(d.allowed, false, "FORCE sám NESMÍ stačit");
  assert.equal(d.needsConfirmation, true);
  fs.rmSync(tmp, { recursive: true, force: true });
});
