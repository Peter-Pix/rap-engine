import { test, expect } from "@playwright/test";

/**
 * Smoke E2E — kritické stránky se načtou, mají H1, žádné console errory
 * a klíčové navigační prvky fungují. Běží na mobile i desktop projektu.
 */

const PAGES = [
  { path: "/", name: "homepage" },
  { path: "/raperi", name: "rappery" },
  { path: "/alba", name: "alba" },
  { path: "/lokality", name: "lokality" },
  { path: "/zanry", name: "zanry" },
  { path: "/hledat?q=baron", name: "hledat" },
];

test.describe("smoke — stránka se načte", () => {
  for (const p of PAGES) {
    test(`${p.name} (${p.path}) — HTTP 200, H1, bez console errorů`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      const res = await page.goto(p.path);
      expect(res?.status(), `HTTP status pro ${p.path}`).toBeLessThan(400);

      await expect(page.locator("h1").first()).toBeVisible();

      // Filtrujeme známý šum (analytics, favicon) — zbytek je reálná chyba
      const realErrors = errors.filter(
        (e) => !/favicon|analytics|gtag|Failed to load resource/i.test(e)
      );
      expect(realErrors, `console errors na ${p.path}`).toEqual([]);
    });
  }
});

test.describe("smoke — navigace", () => {
  test("klik na logo z podstránky vrátí na homepage", async ({ page }) => {
    await page.goto("/raperi");
    await page.getByRole("link", { name: /4rap\.cz — domů|domů/i }).first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("na mobilu je vidět lupa, na desktopu je vidět search input", async ({ page, viewport }) => {
    await page.goto("/");
    if ((viewport?.width ?? 0) < 768) {
      await expect(page.getByRole("button", { name: "Otevřít vyhledávání" })).toBeVisible();
    } else {
      // Desktop má v headeru searchbox (hero sekce má druhý — strict mode)
      await expect(
        page.getByRole("banner").getByRole("searchbox", { name: "Hledat na webu" })
      ).toBeVisible();
    }
  });

  test("stránka /hledat zobrazí výsledky z query parametru", async ({ page }) => {
    await page.goto("/hledat?q=baron");
    await expect(page.locator("h1").first()).toBeVisible();
    // Regression: SearchClient musí inicializovat query z `?q=`.
    // Bez toho stránka ukáže prázdný stav „Začni psát pro vyhledávání“.
    await expect(
      page.getByText("Začni psát pro vyhledávání"),
      "/hledat ignoruje ?q= parametr"
    ).toBeHidden();
    const links = page.locator('a[href^="/raperi/"], a[href^="/alba/"], a[href^="/skladby/"]');
    await expect.poll(async () => links.count()).toBeGreaterThan(0);
  });
});

test.describe("smoke — SEO", () => {
  test("robots.txt a sitemap.xml odpovídají 200", async ({ request }) => {
    for (const path of ["/robots.txt", "/sitemap.xml"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect((await res.text()).length, `${path} je prázdný`).toBeGreaterThan(10);
    }
  });

  test("detail entity má title a OG metadata", async ({ page }) => {
    await page.goto("/raperi");
    const firstArtist = page.locator('a[href^="/raperi/"]').first();
    await firstArtist.click();
    await expect(page).toHaveTitle(/.+/);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle, "chybí og:title na detailu entity").toBeTruthy();
  });
});

/**
 * Mobilní drawer — kategorizovaná navigace (3 skupiny místo plochého seznamu).
 * Cíl: na mobilu se menu nesmí rozbít a musí ukázat skupiny Hudba / Lidé / Kontext.
 */
test.describe("smoke — mobilní drawer", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, "mobile only");

  test("obsahuje 3 kategorizované skupiny", async ({ page }) => {
    await page.route("**/_next/webpack-hmr**", (r) => r.abort());
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // hamburger
    await page.getByRole("button", { name: /menu|navigace/i }).first().click();
    const nav = page.getByRole("navigation", { name: "Hlavní menu" });
    await expect(nav).toBeVisible();

    await expect(nav.getByRole("heading", { name: "Hudba" })).toBeVisible();
    await expect(nav.getByRole("heading", { name: "Lidé a scéna" })).toBeVisible();
    await expect(nav.getByRole("heading", { name: "Kontext" })).toBeVisible();

    // nová routa, která v plochém menu chyběla
    await expect(nav.getByRole("link", { name: "Producenti" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Styly" })).toBeVisible();
  });
});
