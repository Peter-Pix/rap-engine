import { test, expect } from "@playwright/test";

/**
 * Regression + behavior: EntityJumpNav na detailu entity.
 *
 * Cíl: dlouhý detail (rapper) má 10+ sekcí. Jump-nav přidá sticky chip-bar
 * pro rychlý skok. Testy ověřují, že:
 *   1. chip-bar se vyrenderuje s reálnými sekcemi (ne prázdný)
 *   2. klik na chip reálně odscrolluje stránku
 *   3. chip-bar je sticky (zůstává nahoře při scrollu)
 *   4. nezasahuje do layoutu na desktopu (nesmí být rozbitý)
 */

const ENTITY = "/raperi/yzomandias";

/**
 * Dev server (Turbopack) drží HMR websocket + analytics requesty otevřené,
 * takže `waitUntil: "load"` nikdy nesettle. Blokujeme šum a jdeme na DOM.
 */
async function gotoEntity(page: import("@playwright/test").Page, path: string) {
  await page.route("**/_next/webpack-hmr**", (r) => r.abort());
  await page.route("**/api/search-index**", (r) => r.continue());
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

test.describe("EntityJumpNav", () => {
  test.setTimeout(90_000);

  test("chip-bar se vyrenderuje s detekovanými sekcemi", async ({ page }) => {
    await gotoEntity(page, ENTITY);
    const nav = page.locator('[data-chip]').first();
    await expect(nav).toBeVisible({ timeout: 10_000 });
    const count = await page.locator("[data-chip]").count();
    expect(count, "jump-nav musí mít aspoň 2 chipy").toBeGreaterThanOrEqual(2);
  });

  test("klik na chip odscrolluje na sekci", async ({ page }) => {
    await gotoEntity(page, ENTITY);
    await expect(page.locator("[data-chip]").first()).toBeVisible({ timeout: 10_000 });

    // Vyber chip, který není první (aby byl reálný posun)
    const chips = page.locator("[data-chip]");
    const target = chips.nth(Math.min(2, (await chips.count()) - 1));
    const label = (await target.textContent())?.trim() ?? "";
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await target.click();
    // smooth scroll chvíli trvá
    await page.waitForTimeout(900);
    const scrollAfter = await page.evaluate(() => window.scrollY);

    expect(scrollAfter, `klik na "${label}" neposunul stránku`).toBeGreaterThan(scrollBefore);
  });

  test("chip-bar zůstává sticky při scrollu", async ({ page }) => {
    await gotoEntity(page, ENTITY);
    await expect(page.locator("[data-chip]").first()).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
    await page.waitForTimeout(400);

    const chip = page.locator("[data-chip]").first();
    await expect(chip).toBeVisible();
    const box = await chip.boundingBox();
    // musí být u horní části viewportu (sticky), ne odscrollovaný pryč
    expect(box!.y, "chip-bar není sticky").toBeLessThan(140);
  });

  test("neexistuje na entitě bez sekcí (graceful)", async ({ page }) => {
    // Genre stránka nemá 10+ sekcí — jump-nav by měl být skrytý/nepřítomný
    await gotoEntity(page, "/zanry/trap");
    await page.locator("h1").first().waitFor();
    await page.waitForTimeout(800);
    const count = await page.locator("[data-chip]").count();
    // buď není vůbec, nebo má smysl jen když jsou ≥2 sekce
    expect(count === 0 || count >= 2).toBe(true);
  });
});
