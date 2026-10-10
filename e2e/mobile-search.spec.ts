import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Regression: mobilní search overlay.
 *
 * Bug (10. 10. 2026): uživatel na mobilu klikl na lupu, ale input pole bylo
 * ZAKRYTÉ sticky bannerem "Součást AI ekosystému · AI Lab · Karel Robot".
 *
 * Příčina: banner v layout.tsx měl `sticky z-50`, overlay měl taky `z-50`.
 * Banner byl dřív v DOM → vyhrál a překreslil horní pruh overlaye s inputem.
 *
 * Pozn.: homepage má DVA searchboxy (header overlay + hero sekce), proto
 * všechny selektory cílí explicitně na overlay root element.
 */

/** Root element fullscreen search overlaye (Header → MobileSearchOverlay). */
const overlayRoot = (page: Page): Locator =>
  page.locator('div.fixed.inset-0').filter({ hasNot: page.locator("footer") }).first();

const overlayInput = (page: Page): Locator =>
  overlayRoot(page).getByRole("searchbox", { name: "Hledat na webu" });

const overlayClose = (page: Page): Locator =>
  overlayRoot(page).getByRole("button", { name: "Zavřít vyhledávání" });

async function openOverlay(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Otevřít vyhledávání" }).click();
  await expect(overlayInput(page)).toBeVisible();
}

test.describe("mobile search overlay", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, "mobile only (< 768px)");

  test("lupa otevře overlay a input je viditelný NAHOŘE (nad bannerem)", async ({ page }) => {
    await openOverlay(page);

    const input = overlayInput(page);
    await expect(input).toBeFocused();

    // ─── KLÍČOVÝ ASSERT: input NENÍ překrytý jiným elementem ─────────────
    // elementFromPoint vrací element, který je v daném bodě opravdu navrchu.
    // Když bug existuje, vrátí banner / jeho odkazy, ne input.
    const topmostTag = await input.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top) return "NULL";
      if (top === el || el.contains(top)) return "SELF";
      return `${top.tagName}.${(top.className || "").toString().slice(0, 40)} :: ${(top.textContent || "").slice(0, 40)}`;
    });
    expect(topmostTag, "input je zakrytý jiným elementem (stacking kontext)").toBe("SELF");

    // Input musí být celý uvnitř viewportu
    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    const vp = page.viewportSize()!;
    expect(box!.y, "input začíná nad viewportem").toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, "input končí pod viewportem").toBeLessThanOrEqual(vp.height);
  });

  test("sticky banner NENÍ nad otevřeným overlay-em (z-index regrese)", async ({ page }) => {
    await openOverlay(page);

    const { overlayZ, bannerZ } = await page.evaluate(() => {
      const banner = Array.from(document.querySelectorAll("div")).find(
        (d) => d.className.includes("sticky") && d.textContent?.includes("AI ekosystému")
      );
      const overlay = document.querySelector("div.fixed.inset-0");
      const z = (el: Element | null | undefined) => {
        if (!el) return null;
        const v = getComputedStyle(el).zIndex;
        return v === "auto" ? 0 : parseInt(v, 10);
      };
      return { overlayZ: z(overlay), bannerZ: z(banner) };
    });

    expect(bannerZ, "banner nenalezen — zkontroluj layout.tsx").not.toBeNull();
    expect(overlayZ, "overlay nenalezen").not.toBeNull();
    expect(overlayZ!, `overlay (z=${overlayZ}) musí být NAD bannerem (z=${bannerZ})`).toBeGreaterThan(bannerZ!);
  });

  test("psaní do inputu zobrazí výsledky a klik vede na detail", async ({ page }) => {
    await openOverlay(page);

    await overlayInput(page).fill("baron");
    const results = page.locator("#search-results a[href^='/']");
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
    expect(await results.count()).toBeGreaterThan(0);

    await results.first().click();
    await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("zavření křížkem zruší overlay a odemkne scroll", async ({ page }) => {
    await openOverlay(page);

    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    await overlayClose(page).click();
    await expect(overlayRoot(page)).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("Escape zavře overlay", async ({ page }) => {
    await openOverlay(page);
    await page.keyboard.press("Escape");
    await expect(overlayRoot(page)).toBeHidden();
  });

  test("hamburger menu se otevře NAD bannerem (drawer regrese)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Otevřít menu" }).click();

    const nav = page.getByRole("navigation", { name: "Hlavní menu" });
    await expect(nav).toBeVisible();

    const topmost = await nav.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + 40, r.top + 30);
      return top === el || el.contains(top);
    });
    expect(topmost, "drawer menu je překryté bannerem").toBe(true);
  });
});
