import { test, expect, type Page } from "@playwright/test";

/**
 * Behavior: /porovnat — Common Ground (přímé shody dvou rapperů).
 *
 * Ověřuje:
 *   1. stránka se načte, pickery jsou přítomné
 *   2. výběr rappera zapíše ?a= do URL (sdílitelný odkaz)
 *   3. deep-link ?a=&b= rovnou vykreslí výsledky s počtem shod
 *   4. stejný rapper 2× → výzva vybrat dva různé
 *   5. výsledky obsahují alespoň jednu skupinu shod (Yzomandias × Ektor)
 */

const PAIR = "/porovnat?a=artist_yzomandias&b=artist_ektor";

async function goto(page: Page, url: string) {
  await page.route("**/_next/webpack-hmr**", (r) => r.abort());
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor();
}

test.describe("Porovnat (Common Ground)", () => {
  test("stránka se načte s dvěma pickery", async ({ page }) => {
    await goto(page, "/porovnat");
    await expect(page.getByRole("heading", { name: /Porovnat/ }).first()).toBeVisible();
    await expect(page.getByLabel("Rapper A")).toBeVisible();
    await expect(page.getByLabel("Rapper B")).toBeVisible();
    await expect(page.getByText(/Vyber oba rappery/)).toBeVisible();
  });

  test("výběr rappera zapíše ?a= do URL", async ({ page }) => {
    await goto(page, "/porovnat");
    await page.getByLabel("Rapper A").fill("yzomandias");
    await page.getByRole("button", { name: "Yzomandias" }).first().click();
    await expect(page).toHaveURL(/[?&]a=artist_yzomandias/);
  });

  test("deep-link ?a=&b= vykreslí počet shod a skupiny", async ({ page }) => {
    await goto(page, PAIR);
    // počet shod (číslo + jednotka)
    await expect(page.getByText(/společn[áé]/i).first()).toBeVisible();
    // aspoň jedna skupina shod
    await expect(page.getByRole("heading", { name: /Společné/ }).first()).toBeVisible();
  });

  test("stejný rapper dvakrát vyzve k výběru dvou různých", async ({ page }) => {
    await goto(page, "/porovnat?a=artist_yzomandias&b=artist_yzomandias");
    await expect(page.getByText(/dva různé rappery/i)).toBeVisible();
  });

  test("odkaz Porovnat je v hlavní navigaci", async ({ page }) => {
    await goto(page, "/");
    await expect(
      page.getByRole("link", { name: "Porovnat" }).first(),
    ).toBeVisible();
  });
});
