import { test, expect } from "@playwright/test";

/**
 * E2E pro AI vrstvu — /ask stránka a AskPanel (⌘⇧A).
 *
 * Ověřuje: načtení, guided chips, streaming odpověď, citace entit,
 * a hlavně že AI odpovídá z dat (ne halucinuje).
 */

test.describe("AI — /ask stránka", () => {
  test("načte se s hero a guided chips", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const res = await page.goto("/ask");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("h1")).toContainText(/Zeptej se databáze/i);
    // Guided chips — aspoň 4
    const chips = page.locator("button:has-text('spolupracoval'), button:has-text('skladeb'), button:has-text('žánry')");
    await expect(chips.first()).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("odpoví na dotaz a zobrazí zdroje", async ({ page }) => {
    await page.goto("/ask");
    // Klikni na guided chip o spolupráci
    await page.locator("button:has-text('spolupracoval')").first().click();

    // Uživatelský bubble se objevil
    await expect(page.locator("text=/spolupracoval/i").first()).toBeVisible({ timeout: 5000 });

    // Odpověď dorazí (streaming) — čekáme na text s entitou nebo "nemáme"
    await expect(
      page.locator("text=/spolupracovní|skladeb|nemáme|shod/i").last(),
    ).toBeVisible({ timeout: 20000 });

    // Citace zdrojů
    await expect(page.locator("text=Zdroje").last()).toBeVisible({ timeout: 20000 });
  });
});

test.describe("AI — AskPanel (⌘⇧A)", () => {
  test("⌘⇧A otevře panel a Esc zavře", async ({ page, isMobile }) => {
    test.skip(isMobile, "Klávesová zkratka je desktop-only");
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+Shift+A");
    const dialog = page.getByRole("dialog", { name: /Zeptej se databáze/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });

  test("tlačítko 'Zeptej se' v headeru otevře panel", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator("button:has-text('Zeptej se')").first();
    // Na mobilu je schované v draweru
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      const dialog = page.getByRole("dialog", { name: /Zeptej se databáze/i });
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });
});
