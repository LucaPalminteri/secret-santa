import { test, expect, waitForSaves } from "./fixtures";
import type { Page } from "@playwright/test";
import type { ExchangeData } from "../../src/server/validation";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function draft(): ExchangeData {
  return {
    id: "11111111-1111-4111-8111-111111111111", revision: 1,
    status: "draft", listName: "Familia", participants: [],
    delivery: { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 },
  };
}

async function add(page: Page, name: string) {
  await page.getByRole("button", { name: "Agregar participante", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill(name);
  await dialog.getByLabel("Email", { exact: true }).fill(`${name.toLowerCase()}@example.com`);
  await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`${name.toLowerCase()}@example.com`, { exact: true })).toBeVisible();
}

test("creates immediately, accepts more edits during creation, and ignores older responses", async ({ page }, testInfo) => {
  const first = deferred();
  const second = deferred();
  const commands: (ExchangeData & { saveKey: string })[] = [];
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: null });
    const command = route.request().postDataJSON();
    commands.push(command);
    await (commands.length === 1 ? first : second).promise;
    await route.fulfill({ json: { ...draft(), ...command, revision: command.revision + 1 } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Empezar ahora" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Familia");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Monto", { exact: true }).fill("25000");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
  await expect.poll(() => commands.length).toBe(1);
  await add(page, "Ana");
  await add(page, "Bruno");
  expect(commands).toHaveLength(1);
  await expect(page.getByText(/^(Guardado|Guardando cambios\.\.\.|Guardando\.\.\.)$/)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("participants-before-save.png") });
  first.resolve();
  await expect.poll(() => commands.length).toBe(2);
  expect(commands[1].id).toBe(commands[0].id);
  expect(commands[1].revision).toBe(1);
  expect(commands[1].participants.map((person) => person.name)).toEqual(["Ana", "Bruno"]);
  await expect(page.getByText("ana@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("bruno@example.com", { exact: true })).toBeVisible();
  second.resolve();
  await waitForSaves(page);
});

test("applies edits and deletions instantly while serializing background saves", async ({ page }) => {
  const first = deferred();
  const second = deferred();
  const commands: (ExchangeData & { saveKey: string })[] = [];
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: draft() });
    const command = route.request().postDataJSON();
    commands.push(command);
    await (commands.length === 1 ? first : second).promise;
    await route.fulfill({ json: { ...draft(), ...command, revision: command.revision + 1 } });
  });
  await page.goto("/");
  await add(page, "Ana");
  await expect.poll(() => commands.length).toBe(1);
  await page.getByRole("button", { name: "Editar lista", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre de lista").fill("Amigos");
  await dialog.getByLabel("Monto", { exact: true }).fill("15000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Amigos", { exact: true })).toBeVisible();
  await expect(page.getByText("Presupuesto: $15000", { exact: true })).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: "ana@example.com" });
  await row.getByRole("button", { name: "Editar participante" }).click();
  await dialog.getByLabel("Nombre", { exact: true }).fill("Ana María");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(row).toContainText("Ana María");
  await row.getByRole("button", { name: "Eliminar participante" }).click();
  await expect(row).toHaveCount(0);
  expect(commands).toHaveLength(1);
  first.resolve();
  await expect.poll(() => commands.length).toBe(2);
  expect(commands[1]).toMatchObject({ listName: "Amigos", giftAmount: 15000, participants: [], revision: 2 });
  await expect(page.getByText("Amigos", { exact: true })).toBeVisible();
  await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
  second.resolve();
  await waitForSaves(page);
});

test("retries a lost response with the original key before saving newer edits", async ({ page }, testInfo) => {
  const first = deferred();
  let server = draft();
  let lost = false;
  const commands: (ExchangeData & { saveKey: string })[] = [];
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: server });
    const command = route.request().postDataJSON();
    commands.push(command);
    if (!lost) {
      lost = true;
      server = { ...server, ...command, revision: command.revision + 1 };
      await first.promise;
      return route.abort("failed");
    }
    if (command.saveKey !== commands[0].saveKey) {
      expect(command.revision).toBe(server.revision);
      server = { ...server, ...command, revision: command.revision + 1 };
    }
    await route.fulfill({ json: server });
  });
  await page.goto("/");
  await add(page, "Ana");
  await expect.poll(() => commands.length).toBe(1);
  await add(page, "Bruno");
  first.resolve();
  const error = page.getByRole("alert").filter({ hasText: "Hay cambios sin guardar" });
  await expect(error).toBeVisible();
  await expect(page.getByText("bruno@example.com", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("unsaved-changes-recovery.png") });
  await page.getByRole("button", { name: "Reintentar guardado" }).click();
  await waitForSaves(page);
  await expect(error).toHaveCount(0);
  expect(commands).toHaveLength(3);
  expect(commands[1]).toEqual(commands[0]);
  expect(commands[2].participants.map((person) => person.name)).toEqual(["Ana", "Bruno"]);
  await page.reload();
  await expect(page.getByText("bruno@example.com", { exact: true })).toBeVisible();
});

test("waits for pending saves before drawing with the acknowledged revision", async ({ page }) => {
  const save = deferred();
  let server = draft();
  server.participants = ["Ana", "Bruno", "Carla"].map((name, index) => ({ id: `person-${index}`, name, email: `${name.toLowerCase()}@example.com` }));
  const draws: { revision: number }[] = [];
  await page.route("**/api/exchange", async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill({ json: server });
    const command = route.request().postDataJSON();
    if (method === "PUT") {
      await save.promise;
      server = { ...server, ...command, revision: command.revision + 1 };
    } else {
      draws.push(command);
      server = { ...server, status: "drawn", delivery: { pending: 0, sending: 0, sent: 3, failed: 0, unknown: 0 } };
    }
    await route.fulfill({ json: server });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Editar lista" }).click();
  await page.getByLabel("Nombre de lista").fill("Amigos");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Amigos", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Asignar Secret Santas" }).click();
  await expect(page.getByText("Asignando", { exact: true })).toBeVisible();
  expect(draws).toHaveLength(0);
  save.resolve();
  await expect(page.getByText("¡Asignación completada!", { exact: true })).toBeVisible();
  expect(draws).toEqual([expect.objectContaining({ revision: 2 })]);
});

test("preserves local changes if recovery fails, and discards them only after recovery succeeds", async ({ page }) => {
  let failRead = false;
  await page.route("**/api/exchange", (route) => {
    if (route.request().method() === "GET" && !failRead) return route.fulfill({ json: draft() });
    return route.fulfill({ status: 503, json: { error: "Sin conexión." } });
  });
  await page.goto("/");
  await add(page, "Ana");
  await expect(page.getByRole("button", { name: "Reintentar guardado" })).toBeVisible();
  failRead = true;
  await page.getByRole("button", { name: "Descartar cambios y recuperar lista guardada" }).click();
  await expect(page.getByRole("button", { name: "Descartar cambios y recuperar lista guardada" })).toBeEnabled();
  await expect(page.getByText("ana@example.com", { exact: true })).toBeVisible();
  failRead = false;
  await page.getByRole("button", { name: "Descartar cambios y recuperar lista guardada" }).click();
  await expect(page.getByText("ana@example.com", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reintentar guardado" })).toHaveCount(0);
});

test("keeps conflicting edits visible without overwriting another tab's revision", async ({ page }) => {
  let server = draft();
  let writes = 0;
  await page.route("**/api/exchange", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: server });
    writes++;
    server = { ...server, revision: 2, listName: "Actualizada en otra pestaña" };
    return route.fulfill({ status: 409, json: { error: "La lista cambió en otra pestaña. Recarga antes de editar." } });
  });
  await page.goto("/");
  await add(page, "Ana");
  await expect(page.getByText("La lista cambió en otra pestaña. Recarga antes de editar.")).toBeVisible();
  await add(page, "Bruno");
  expect(writes).toBe(1);
  await expect(page.getByText("ana@example.com", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Descartar cambios y recuperar lista guardada" }).click();
  await expect(page.getByText("Actualizada en otra pestaña", { exact: true })).toBeVisible();
  await expect(page.getByText("ana@example.com", { exact: true })).toHaveCount(0);
  expect(writes).toBe(1);
});

test("saves a corrected draft after a definitive validation rejection", async ({ page }) => {
  const commands: (ExchangeData & { saveKey: string })[] = [];
  await page.route("**/api/exchange", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: draft() });
    const command = route.request().postDataJSON();
    commands.push(command);
    if (commands.length === 1) return route.fulfill({ status: 400, json: { error: "Revisa los datos del participante." } });
    return route.fulfill({ json: { ...draft(), ...command, revision: command.revision + 1 } });
  });
  await page.goto("/");
  await add(page, "Ana");
  await expect(page.getByText("Revisa los datos del participante.")).toBeVisible();
  await page.getByRole("button", { name: "Eliminar participante" }).click();
  await expect(page.getByText("No hay participantes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reintentar guardado" }).click();
  await waitForSaves(page);
  expect(commands).toHaveLength(2);
  expect(commands[1].saveKey).not.toBe(commands[0].saveKey);
  expect(commands[1]).toMatchObject({ revision: 1, participants: [] });
});
