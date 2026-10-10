import { test, expect, type Page } from "@playwright/test";

/**
 * SEO gate: generované skladby bez obsahu musí být noindex.
 *
 * Chrání před thin-content penalizací — po importu 3766 skladeb z tracklistů
 * má DB tisíce holých stránek. Ty nesmí být indexovatelné, dokud nedostanou
 * popis (fáze 3).
 */

async function goto(page: Page, url: string) {
  await page.route("**/_next/webpack-hmr**", (r) => r.abort());
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

test.describe("noindex gate", () => {
  test("importovaná skladba bez obsahu má robots noindex", async ({ page }) => {
    await goto(page, "/skladby/dame-100ry");
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

  test("sitemap neobsahuje importované skladby", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const xml = await res.text();
    expect(xml).not.toContain("dame-100ry");
    // ale známé bohaté entity tam být mají
    expect(xml).toContain("/raperi/yzomandias");
  });
});
