import { test, expect, createList, addParticipant, waitForSaves } from "./fixtures";

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
  await expect(dialog).toBeHidden();
  await waitForSaves(page);
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
  await waitForSaves(page);
  await page.reload();
  row = page.getByRole("listitem").filter({ hasText: "ana@example.com" });
  await expect(row).toContainText("Ana María");
  await row.getByRole("button", { name: "Eliminar participante" }).click();
  await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
  await waitForSaves(page);
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
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Asignar Secret Santas" })).toBeDisabled();
  });
}

test("rejects duplicate emails regardless of case", async ({ page }) => {
  await createList(page);
  await addParticipant(page, "Ana", "ana@example.com");
  await addParticipant(page, "Otra Ana", "ANA@example.com");
  await expect(page.getByText("Este correo electrónico ya está registrado.", { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
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

test("starts fresh without importing old localStorage", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("secretSantaData", JSON.stringify({ listName: "Old browser list", participants: [] })));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Empezar ahora" })).toBeVisible();
  await expect(page.getByText("Old browser list")).toHaveCount(0);
});

test("keeps load failures separate from an empty draft", async ({ page }) => {
  let fail = true;
  await page.route("**/api/exchange", async (route) => {
    if (fail && route.request().method() === "GET") return route.fulfill({ status: 503, json: { error: "Temporary load failure" } });
    await route.fallback();
  });
  await page.goto("/");
  await expect(page.getByText("Temporary load failure")).toBeVisible();
  await expect(page.getByRole("button", { name: "Empezar ahora" })).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Reintentar carga" }).click();
  await expect(page.getByRole("button", { name: "Empezar ahora" })).toBeVisible();
});

test("retries a committed save after a lost response without duplicating it", async ({ page }) => {
  await createList(page);
  await page.getByRole("button", { name: "Editar lista" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar lista" });
  await dialog.getByLabel("Nombre de lista").fill("Recovered save");
  const keys: string[] = [];
  let loseResponse = true;
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "PUT") {
      keys.push(route.request().postDataJSON().saveKey);
      if (loseResponse) {
        loseResponse = false;
        await route.fetch();
        return route.abort("failed");
      }
    }
    await route.fallback();
  });
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Recovered save", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reintentar guardado" }).click();
  await waitForSaves(page);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await page.reload();
  await expect(page.getByText("Recovered save", { exact: true })).toBeVisible();
});

test("isolates anonymous browsers and rejects stale edits from another tab", async ({ page, browser, context }) => {
  await createList(page);
  const other = await browser.newContext();
  const stranger = await other.newPage();
  await stranger.goto("/");
  await expect(stranger.getByRole("button", { name: "Empezar ahora" })).toBeVisible();
  await other.close();
  const tab = await context.newPage();
  await tab.goto("/");
  await expect(tab.getByText("Navidad de prueba", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar lista" }).click();
  let dialog = page.getByRole("dialog", { name: "Editar lista" });
  await dialog.getByLabel("Nombre de lista").fill("Latest version");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
  await waitForSaves(page);
  await tab.getByRole("button", { name: "Editar lista" }).click();
  dialog = tab.getByRole("dialog", { name: "Editar lista" });
  await dialog.getByLabel("Nombre de lista").fill("Stale edit");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(tab.getByText("La lista cambió en otra pestaña. Recarga antes de editar.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await tab.getByRole("button", { name: "Editar lista" }).click();
  await expect(dialog.getByLabel("Nombre de lista")).toHaveValue("Stale edit");
  await page.reload();
  await expect(page.getByText("Latest version", { exact: true })).toBeVisible();
});

test("rejects cross-origin writes before creating a session", async ({ page }) => {
  await page.goto("/");
  const response = await page.request.put("/api/exchange", { headers: { Origin: "https://different.example" }, data: {} });
  expect(response.status()).toBe(403);
  expect(response.headers()["set-cookie"]).toBeUndefined();
});

test("keeps a partially delivered draw and retries failed emails without resetting the list", async ({ page }) => {
  await createList(page);
  await addParticipant(page, "Ana", "ana@example.com");
  await addParticipant(page, "Bruno", "bruno@example.com");
  await addParticipant(page, "Carla", "carla@example.com");
  await expect(page.getByRole("listitem").filter({ hasText: "carla@example.com" })).toBeVisible();
  const saved = await (await page.request.get("/api/exchange")).json();
  const simulated = { ...saved, status: "drawn", revision: saved.revision + 1,
    delivery: { pending: 0, sending: 0, failed: 1, unknown: 0, sent: 2 } };
  const calls: { id: string; retry: string | null }[] = [];
  // Simulate SMTP outcomes at the HTTP boundary; never contact the mail sender.
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: simulated });
    if (route.request().method() === "POST") {
      const command = route.request().postDataJSON();
      if (command.action === "complete") return route.fulfill({ json: null });
      calls.push(command);
      if (command.retry === "failed") simulated.delivery = { pending: 0, sending: 0, failed: 0, unknown: 0, sent: 3 };
      return route.fulfill({ json: simulated });
    }
    await route.fallback();
  });
  await page.getByRole("button", { name: "Asignar Secret Santas" }).click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByText("Navidad de prueba", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar lista" })).toBeDisabled();
  await page.getByRole("button", { name: "Reintentar correos fallidos" }).click();
  await expect(page.getByText("¡Asignación completada!")).toBeVisible();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Empezar ahora" })).toBeVisible();
  expect(calls).toHaveLength(2);
  expect(calls[0].id).toBe(calls[1].id);
  expect(calls[1].retry).toBe("failed");
});
