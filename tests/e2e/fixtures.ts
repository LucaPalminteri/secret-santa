import { test as base, expect, type Page } from "@playwright/test";

// Permit database saves, but block the draw/delivery endpoint before it can send
// mail. The test server also has empty SMTP credentials and an isolated database.
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.route("**/*", async (route) => {
      if (
        route.request().method() === "POST" &&
        new URL(route.request().url()).pathname === "/api/exchange" &&
        route.request().postDataJSON()?.action === "draw"
      ) {
        await route.abort("blockedbyclient");
      } else {
        await route.continue();
      }
    });
    await runTest(page);
  },
});

export { expect };

export async function createList(page: Page, budget?: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Empezar", exact: true }).click();
  await page.getByLabel("Nombre del sorteo").fill("Navidad de prueba");
  if (budget) await page.getByLabel("Presupuesto por regalo").fill(budget);
  await page
    .getByRole("button", { name: "Agregar participantes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Navidad de prueba", exact: true }),
  ).toBeVisible();
  await waitForSaves(page);
}

export async function addParticipant(page: Page, name: string, email: string) {
  const form = page.getByRole("form", {
    name: "Agregar participante",
    exact: true,
  });
  await form.getByLabel("Nombre", { exact: true }).fill(name);
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form
    .getByRole("button", { name: "Agregar participante", exact: true })
    .click();
  await waitForSaves(page);
}

export async function waitForSaves(page: Page) {
  await expect(
    page.getByRole("group", { name: "Sorteo", exact: true }),
  ).toHaveAttribute("aria-busy", "false");
}
