import { test, expect, createList, addParticipant } from "./fixtures";

test("requires a list name and allows cancelling setup", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Secret Santa", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Empezar ahora" }).click();
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  await page.getByLabel("Nombre", { exact: true }).fill("   ");
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Empezar ahora" })).toBeVisible();
});

test("creates a list with a budget and restores it after reload", async ({ page }) => {
  await createList(page, "25000");
  await expect(page.getByText("Navidad de prueba", { exact: true })).toBeVisible();
  await expect(page.getByText("Presupuesto: $25000", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Navidad de prueba", { exact: true })).toBeVisible();
  await expect(page.getByText("Presupuesto: $25000", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Asignar Secret Santas" })).toBeDisabled();
});

test("supports an optional budget and editing list details", async ({ page }) => {
  await createList(page);
  await expect(page.getByText("Sin presupuesto definido", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar lista", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Editar lista", exact: true });
  await dialog.getByLabel("Nombre de lista").fill("Cambio cancelado");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("Navidad de prueba", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar lista", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Editar lista", exact: true });
  await expect(dialog.getByLabel("Nombre de lista")).toHaveValue("Navidad de prueba");
  await dialog.getByLabel("Nombre de lista").fill("Familia");
  await dialog.getByLabel("Monto", { exact: true }).fill("15000");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await page.reload();
  await expect(page.getByText("Familia", { exact: true })).toBeVisible();
  await expect(page.getByText("Presupuesto: $15000", { exact: true })).toBeVisible();
});

test("adds, edits, persists, and removes a participant", async ({ page }) => {
  await createList(page);
  await addParticipant(page, "Ana", "ana@example.com");
  let row = page.getByRole("listitem").filter({ hasText: "ana@example.com" });
  await expect(row).toContainText("Ana");
  await row.getByRole("button", { name: "Editar participante" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar participante", exact: true });
  await expect(dialog.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Ana María");
  // Keeping the email unchanged must be allowed when editing its owner.
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(row).toContainText("Ana María");
  await page.reload();
  row = page.getByRole("listitem").filter({ hasText: "ana@example.com" });
  await expect(row).toContainText("Ana María");
  await row.getByRole("button", { name: "Eliminar participante" }).click();
  await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
});

for (const { name, email, message } of [
  { name: "", email: "ana@example.com", message: "Por favor, ingresa un nombre." },
  { name: "Ana", email: "", message: "Por favor, ingresa un correo electrónico." },
  { name: "Ana", email: "invalid", message: "Por favor, ingresa un correo electrónico válido." },
]) {
  test(`rejects invalid participant: ${message}`, async ({ page }) => {
    await createList(page);
    await addParticipant(page, name, email);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Asignar Secret Santas" })).toBeDisabled();
  });
}

test("rejects duplicate emails regardless of case", async ({ page }) => {
  await createList(page);
  await addParticipant(page, "Ana", "ana@example.com");
  await addParticipant(page, "Otra Ana", "ANA@example.com");
  await expect(page.getByText("Este correo electrónico ya está registrado.", { exact: true })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "ana@example.com" })).toHaveCount(1);
  await expect(page.getByRole("listitem").filter({ hasText: "Otra Ana" })).toHaveCount(0);
});

test("requires three participants before enabling assignment", async ({ page }) => {
  await createList(page);
  const assign = page.getByRole("button", { name: "Asignar Secret Santas" });
  await expect(assign).toBeDisabled();
  await addParticipant(page, "Ana", "ana@example.com");
  await expect(assign).toBeDisabled();
  await addParticipant(page, "Bruno", "bruno@example.com");
  await expect(assign).toBeDisabled();
  await addParticipant(page, "Carla", "carla@example.com");
  await expect(assign).toBeEnabled();
  await page.getByRole("listitem").filter({ hasText: "carla@example.com" })
    .getByRole("button", { name: "Eliminar participante" }).click();
  await expect(assign).toBeDisabled();
});

test("opens help and returns to the saved list", async ({ page }) => {
  await createList(page);
  await page.getByRole("link", { name: "Cómo funciona (ayuda)" }).click();
  await expect(page).toHaveURL("/help");
  await expect(page.getByRole("heading", { name: "Cómo funciona" })).toBeVisible();
  await page.getByRole("link", { name: "Volver a la app" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Navidad de prueba", { exact: true })).toBeVisible();
});
