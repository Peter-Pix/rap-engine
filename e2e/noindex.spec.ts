import { test, expect, type Page } from "@playwright/test";

/**
 * SEO gate: generované skladby bez obsahu musí být noindex.
 *
 * Chrání před thin-content penalizací. Smlouva fáze 3 (od 11. 10. 2026):
 * - C-metadata skladby (holá data, bez textu) → noindex zůstává
 * - A/B skladby (bohatý obsah z fáze 3) → noindex sundán, indexují se
 *
 * Zástupci: grey256-wow = C (noindex), dame-100ry = B obohacená fází 3.
 */

async function goto(page: Page, url: string) {
  await page.route("**/_next/webpack-hmr**", (r) => r.abort());
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

test.describe("noindex gate", () => {
  test("C-metadata skladba (holá data) má robots noindex", async ({ page }) => {
    await goto(page, "/skladby/grey256-wow");
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
  });

  test("bohatá skladba (s MDX) index zůstává", async ({ page }) => {
    await goto(page, "/skladby/hard-rico-narcos");
    const robots = page.locator('meta[name="robots"]');
    const content = await robots.getAttribute("content");
    // buď žádný noindex, nebo robots meta chybí (default index)
    expect(content ?? "").not.toContain("noindex");
  });

  test("fází 3 obohacená skladba (dame-100ry, Pás B) je indexovatelná", async ({ page }) => {
    await goto(page, "/skladby/dame-100ry");
    const robots = page.locator('meta[name="robots"]');
    const content = await robots.getAttribute("content");
    expect(content ?? "").not.toContain("noindex");
  });

  test("sitemap neobsahuje C-metadata skladby", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const xml = await res.text();
    expect(xml).not.toContain("grey256-wow");
    // ale známé bohaté entity tam být mají
    expect(xml).toContain("/raperi/yzomandias");
  });
});
