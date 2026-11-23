import { test, expect } from "./fixtures";
import type { ExchangeData } from "../../src/server/validation";

for (const restoreList of [false, true]) {
  test(`shows welcome during a slow lookup, then ${restoreList ? "restores the saved list" : "stays on welcome"}`, async ({
    page,
  }, testInfo) => {
    let resolveLookup!: (data: ExchangeData | null) => void;
    const lookup = new Promise<ExchangeData | null>((resolve) => {
      resolveLookup = resolve;
    });
    let writes = 0;
    await page.route("**/api/exchange", async (route) => {
      if (route.request().method() !== "GET") writes++;
      await route.fulfill({ json: await lookup });
    });
    await page.goto("/");
    const heading = page.getByRole("heading", {
      name: "Una sorpresa para compartir.",
      exact: true,
    });
    const start = page.getByRole("button", {
      name: "Empezar",
      exact: true,
    });
    await expect(heading).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "¿Cómo funciona? (ayuda)" }),
    ).toBeVisible();
    await expect(
      page.getByText("Cargando tu lista...", { exact: true }),
    ).toHaveCount(0);
    await expect(start).toBeDisabled();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await page.screenshot({
      animations: "disabled",
      style: "nextjs-portal { display: none; }",
      path: testInfo.outputPath("welcome-during-lookup.png"),
    });

    resolveLookup(
      restoreList
        ? {
            id: "11111111-1111-4111-8111-111111111111",
            revision: 1,
            listName: "Navidad en familia",
            giftAmount: 25000,
            participants: [
              {
                id: "22222222-2222-4222-8222-222222222222",
                name: "Ana",
                email: "ana@example.com",
              },
            ],
            status: "draft",
            delivery: {
              pending: 0,
              sending: 0,
              sent: 0,
              failed: 0,
              unknown: 0,
            },
          }
        : null,
    );
    if (restoreList) {
      await expect(
        page.getByText("Navidad en familia", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("ana@example.com", { exact: true }),
      ).toBeVisible();
      await expect(heading).toHaveCount(0);
    } else {
      await expect(start).toBeEnabled();
      await expect(heading).toBeVisible();
    }
    expect(writes).toBe(0);
    await page.screenshot({
      animations: "disabled",
      style: "nextjs-portal { display: none; }",
      path: testInfo.outputPath(
        restoreList ? "restored-list.png" : "welcome-ready.png",
      ),
    });
    if (!restoreList) {
      await page.setViewportSize({ width: 320, height: 568 });
      await expect(start).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(320);
      const bounds = await start.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
      await page.screenshot({
        animations: "disabled",
        style: "nextjs-portal { display: none; }",
        path: testInfo.outputPath("welcome-narrow.png"),
      });
    }
  });
}

test("keeps recovery styled when lookup fails and recovers without a loading screen", async ({
  page,
}, testInfo) => {
  let fail = true;
  await page.route("**/api/exchange", (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { error: "No se pudo conectar. Intenta nuevamente." },
        })
      : route.fulfill({ json: null }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "No pudimos recuperar tu lista",
      exact: true,
    }),
  ).toBeVisible();
  const recovery = page
    .getByRole("alert")
    .filter({ hasText: "No se pudo conectar" });
  await expect(recovery).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Empezar", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("lookup-error.png"),
  });
  fail = false;
  await page.getByRole("button", { name: "Reintentar carga" }).click();
  await expect(
    page.getByRole("button", { name: "Empezar", exact: true }),
  ).toBeEnabled();
  await expect(recovery).toHaveCount(0);
  await expect(
    page.getByText("Cargando tu lista...", { exact: true }),
  ).toHaveCount(0);
});
