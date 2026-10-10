import { test, expect, type Page } from "@playwright/test";

/**
 * Behavior: mobilní filtrační bottom-sheet (FilterSheet).
 *
 * Cíl: na mobilu byl inline filter panel nepoužitelný (zabral celou
 * obrazovku, nezavřel se po výběru). Nahrazen iOS bottom-sheetem:
 *   - tlačítko "Filtry" otevře sheet zespoda
 *   - po výběru filtru zůstává otevřený, CTA "Zobrazit X výsledků" ho zavře
 *   - Esc + backdrop zavře
 *   - aktivní filtr se propíše do počtu výsledků na CTA
 * Desktop má inline panel (sheet se nepoužívá).
 */

async function gotoListing(page: Page) {
  await page.route("**/_next/webpack-hmr**", (r) => r.abort());
  await page.goto("/raperi", { waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor();
}

test.describe("FilterSheet (mobile)", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 640, "mobile only (< 640px)");

  test("tlačítko Filtry otevře sheet", async ({ page }) => {
    await gotoListing(page);
    await page.getByRole("button", { name: /^Filtry/ }).first().click();
    const sheet = page.getByRole("dialog", { name: "Filtry" });
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    // grab-handle / CTA musí být v sheetu
    await expect(sheet.getByRole("button", { name: /Zobrazit .* výsled/ })).toBeVisible();
  });

  test("CTA zobrazuje počet a zavře sheet", async ({ page }) => {
    await gotoListing(page);
    await page.getByRole("button", { name: /^Filtry/ }).first().click();
    const sheet = page.getByRole("dialog", { name: "Filtry" });
    const cta = sheet.getByRole("button", { name: /Zobrazit .* výsled/ });
    await expect(cta).toBeVisible();

    await cta.click();
    await expect(sheet).toBeHidden();
  });

  test("výběr filtru se propíše do počtu výsledků", async ({ page }) => {
    await gotoListing(page);
    await page.getByRole("button", { name: /^Filtry/ }).first().click();
    const sheet = page.getByRole("dialog", { name: "Filtry" });
    const cta = sheet.getByRole("button", { name: /Zobrazit .* výsled/ });
    const before = (await cta.textContent()) ?? "";

    // klikni na první dostupný filtr (chip v sheetu, bez headeru)
    const chip = sheet.locator("button").filter({ hasNotText: /Zobrazit|Zrušit/ }).nth(1);
    await chip.click();
    await page.waitForTimeout(300);
    const after = (await cta.textContent()) ?? "";

    expect(after).not.toEqual(before);
  });

  test("Esc zavře sheet a odemkne scroll", async ({ page }) => {
    await gotoListing(page);
    await page.getByRole("button", { name: /^Filtry/ }).first().click();
    const sheet = page.getByRole("dialog", { name: "Filtry" });
    await expect(sheet).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  });
});

test.describe("FilterSheet (desktop)", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 640, "desktop only");

  test("desktop má inline panel, ne sheet", async ({ page }) => {
    await page.route("**/_next/webpack-hmr**", (r) => r.abort());
    await page.goto("/raperi", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Filtry/ }).first().click();
    await page.waitForTimeout(300);
    // sheet (dialog) se na desktopu nesmí objevit
    await expect(page.getByRole("dialog", { name: "Filtry" })).toHaveCount(0);
  });
});
