import { test, expect, createList, addParticipant } from "./fixtures";
import type { Page } from "@playwright/test";
import type { ExchangeData } from "../../src/server/validation";

async function mockExchange(page: Page, existing = true) {
  let saved: ExchangeData | null = existing ? {
    id: "11111111-1111-4111-8111-111111111111", revision: 1,
    status: "draft", listName: "Familia", participants: [],
    delivery: { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 },
  } : null;
  const commands: { id: string; saveKey: string; participants: { id: string }[] }[] = [];
  await page.route("**/api/exchange", (route) => {
    if (route.request().method() === "PUT") {
      const command = route.request().postDataJSON();
      commands.push(command);
      saved = { delivery: { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 }, status: "draft", ...command, revision: command.revision + 1 };
    }
    return route.fulfill({ json: saved });
  });
  return commands;
}

test("creates a list and saves participants when crypto.randomUUID is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
  });
  const commands = await mockExchange(page, false);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await createList(page, "25000");
  await addParticipant(page, "Ana", "ana@example.com");
  expect(commands).toHaveLength(2);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const command of commands) {
    expect(command.id).toMatch(uuid);
    expect(command.saveKey).toMatch(uuid);
  }
  expect(commands[1].id).toBe(commands[0].id);
  expect(commands[1].saveKey).not.toBe(commands[0].saveKey);
  expect(commands[1].participants[0].id).toMatch(uuid);
  expect(errors).toEqual([]);
});
