import { test, expect } from "./fixtures";
import type { ExchangeData } from "../../src/server/validation";

// Exercise frontend behavior independently of database availability and SMTP.
test.beforeEach(async ({ page }) => {
  let saved: ExchangeData | null = {
    id: "11111111-1111-4111-8111-111111111111",
    revision: 1,
    listName: "Familia",
    participants: [],
    status: "draft",
    delivery: { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 },
  };
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "PUT") {
      saved = { ...saved!, ...route.request().postDataJSON(), revision: saved!.revision + 1 };
    }
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 503, json: { error: "No se pudo enviar. Intenta nuevamente." } });
    }
    await route.fulfill({ json: saved });
  });
  await page.goto("/");
  await expect(page.getByText("Familia", { exact: true })).toBeVisible();
});

test("keeps invalid details open, associates errors with fields, and saves the correction", async ({ page }) => {
  let saves = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/exchange") && request.method() === "PUT") saves++;
  });
  await page.getByRole("button", { name: "Agregar participante", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Agregar participante" })).toBeVisible();
  await dialog.getByLabel("Nombre", { exact: true }).fill("Ana");
  const email = dialog.getByLabel("Email", { exact: true });
  await email.fill("invalid");
  await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("Por favor, ingresa un correo electrónico válido.");
  await expect(dialog.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  expect(saves).toBe(0);
  await email.fill("ana@example.com");
  await email.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("ana@example.com", { exact: true })).toBeVisible();
  expect(saves).toBe(1);
});

test("retains optimistic participant and list edits when background saving fails", async ({ page }) => {
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "PUT") return route.fulfill({ status: 503, json: { error: "Guardado no disponible." } });
    await route.fallback();
  });
  await page.getByRole("button", { name: "Agregar participante", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Ana");
  await dialog.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("alert").filter({ hasText: "Hay cambios sin guardar" })).toContainText("Guardado no disponible.");
  await expect(page.getByText("ana@example.com", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar lista" }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Editar lista" })).toBeVisible();
  await dialog.getByLabel("Nombre de lista").fill("Familia y amigos");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Familia y amigos", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar lista" }).click();
  await expect(dialog.getByLabel("Nombre de lista")).toHaveValue("Familia y amigos");
});

test("supports keyboard navigation and restores focus after closing a dialog", async ({ page }) => {
  const opener = page.getByRole("button", { name: "Agregar participante", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog");
  const name = dialog.getByLabel("Nombre", { exact: true });
  const email = dialog.getByLabel("Email", { exact: true });
  await expect(name).toBeFocused();
  await name.fill("Ana");
  await name.press("Enter");
  await expect(email).toBeFocused();
  await dialog.getByRole("button", { name: "Agregar", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(name).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Agregar", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("keeps controls usable on a narrow screen with limited vertical space", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.getByRole("button", { name: "Agregar participante", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(dialog.getByLabel("Email")).toHaveAttribute("inputmode", "email");
  await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(2);
  for (const control of await dialog.locator("input, button").all()) {
    await control.scrollIntoViewIfNeeded();
    const bounds = await control.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
});

test("shows setup actions and prevents offscreen fields from receiving focus", async ({ page }) => {
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: null });
    await route.fallback();
  });
  await page.reload();
  await page.getByRole("button", { name: "Empezar ahora" }).click();
  await expect(page.getByRole("button", { name: "Cancelar" })).toHaveText("Cancelar");
  await expect(page.getByRole("button", { name: "Siguiente" })).toHaveText("Siguiente");
  const name = page.getByLabel("Nombre", { exact: true });
  await name.fill("Familia");
  await name.press("Tab");
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Empezar ahora" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
