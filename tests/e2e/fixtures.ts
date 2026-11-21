import { test as base, expect, type Page } from "@playwright/test";

// Next.js Server Actions use POST. Block them before they can send real mail.
// Each test receives a fresh browser context and empty localStorage by default.
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") {
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
  await page.getByRole("button", { name: "Empezar ahora" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Navidad de prueba");
  await page.getByRole("button", { name: "Siguiente" }).click();
  if (budget) await page.getByLabel("Monto", { exact: true }).fill(budget);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
}

export async function addParticipant(page: Page, name: string, email: string) {
  await page.getByRole("button", { name: "Agregar participante", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar participante", exact: true });
  await dialog.getByLabel("Nombre", { exact: true }).fill(name);
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
}
