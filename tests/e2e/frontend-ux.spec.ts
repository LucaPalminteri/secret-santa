import { test, expect } from "./fixtures";
import type { ExchangeData } from "../../src/server/validation";
import type { Locator } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  let saved: ExchangeData = {
    id: "11111111-1111-4111-8111-111111111111",
    revision: 1,
    listName: "Familia",
    participants: [],
    status: "draft",
    delivery: { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 },
  };
  await page.route("**/api/exchange", (route) => {
    if (route.request().method() === "PUT")
      saved = {
        ...saved,
        ...route.request().postDataJSON(),
        revision: saved.revision + 1,
      };
    return route.fulfill({ json: saved });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Familia", exact: true }),
  ).toBeVisible();
});

test("corrects inline errors and immediately prepares the next participant", async ({
  page,
}, testInfo) => {
  const form = page.getByRole("form", {
    name: "Agregar participante",
    exact: true,
  });
  const name = form.getByLabel("Nombre", { exact: true });
  const email = form.getByLabel("Email", { exact: true });
  await name.fill("Ana");
  await name.press("Enter");
  await expect(email).toBeFocused();
  await email.fill("invalid");
  await email.press("Enter");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription(
    "Por favor, ingresa un correo electrónico válido.",
  );
  await expect(name).toHaveValue("Ana");
  await email.fill("ana@example.com");
  await email.press("Enter");
  await expect(
    page.getByText("ana@example.com", { exact: true }),
  ).toBeVisible();
  await expect(name).toHaveValue("");
  await expect(email).toHaveValue("");
  await expect(name).toBeFocused();
  await expect(
    page.getByText("Agrega 2 personas más.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("participants.png"),
    fullPage: true,
  });
});

test("reveals participant actions and does not replay input entrances after blur", async ({
  page,
}) => {
  await page.addInitScript(() => {
    document.addEventListener(
      "animationstart",
      (event) => {
        if (!(event.target instanceof HTMLButtonElement)) return;
        const label = event.target.textContent?.trim();
        if (label === "Agregar participante")
          document.documentElement.dataset.addEntrance = event.animationName;
        if (label === "Revisar sorteo")
          document.documentElement.dataset.reviewEntrance = event.animationName;
      },
      true,
    );
  });
  await page.reload();
  await expect
    .poll(() => page.locator("html").getAttribute("data-add-entrance"))
    .toBe("stepEnter");
  await expect
    .poll(() => page.locator("html").getAttribute("data-review-entrance"))
    .toBe("appEnter");

  const checkBlur = async (input: Locator, value: string) => {
    await input.fill(value);
    await input.evaluate((element) => {
      const field = element.closest<HTMLElement>(".stagger-fields > *")!;
      field.dataset.replays = "0";
      field.addEventListener("animationstart", (event) => {
        if (event.target === field)
          field.dataset.replays = String(Number(field.dataset.replays) + 1);
      });
    });
    for (let cycle = 0; cycle < 2; cycle++) {
      await input.press("Tab");
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(
        await input.evaluate((element) => {
          const field = element.closest<HTMLElement>(".stagger-fields > *")!;
          return {
            replays: field.dataset.replays,
            opacity: getComputedStyle(field).opacity,
          };
        }),
      ).toEqual({ replays: "0", opacity: "1" });
      await input.focus();
    }
    await expect(input).toHaveValue(value);
  };
  const participant = page.getByRole("form", {
    name: "Agregar participante",
    exact: true,
  });
  await checkBlur(participant.getByLabel("Nombre", { exact: true }), "Ana");
  await checkBlur(
    participant.getByLabel("Email", { exact: true }),
    "ana@example.com",
  );

  await page.route("**/api/exchange", (route) => route.fulfill({ json: null }));
  await page.reload();
  await page.getByRole("button", { name: "Empezar", exact: true }).click();
  await checkBlur(page.getByLabel("Nombre del sorteo"), "Navidad en familia");
  await checkBlur(page.getByLabel("Presupuesto por regalo"), "25000");
});

test("retains optimistic participant and list edits when background saving fails", async ({
  page,
}) => {
  await page.route("**/api/exchange", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 503,
          json: { error: "Guardado no disponible." },
        })
      : route.fallback(),
  );
  const form = page.getByRole("form", {
    name: "Agregar participante",
    exact: true,
  });
  await form.getByLabel("Nombre", { exact: true }).fill("Ana");
  await form.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await form
    .getByRole("button", { name: "Agregar participante", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Hay cambios sin guardar" }),
  ).toContainText("Guardado no disponible.");
  await expect(
    page.getByText("ana@example.com", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar lista" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre de lista").fill("Familia y amigos");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Familia y amigos", exact: true }),
  ).toBeVisible();
});

test("supports keyboard navigation and restores focus after editing", async ({
  page,
}) => {
  const opener = page.getByRole("button", { name: "Editar lista" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  const name = dialog.getByLabel("Nombre de lista");
  await expect(name).toBeFocused();
  await dialog.getByRole("button", { name: "Guardar", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(name).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("keeps forms and long participant details usable at 320px", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const form = page.getByRole("form", {
    name: "Agregar participante",
    exact: true,
  });
  await form
    .getByRole("button", { name: "Agregar participante", exact: true })
    .click();
  await expect(form.getByRole("alert")).toHaveCount(2);
  for (const control of await form.locator("input, button").all()) {
    const bounds = await control.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  await form
    .getByLabel("Nombre", { exact: true })
    .fill("María de los Ángeles Fernández");
  await form
    .getByLabel("Email", { exact: true })
    .fill("maria.fernandez.con.apellido.largo@example.com");
  await form
    .getByRole("button", { name: "Agregar participante", exact: true })
    .click();
  await expect(page.getByRole("listitem")).toContainText(
    "maria.fernandez.con.apellido.largo@example.com",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("narrow-participants.png"),
    fullPage: true,
  });
});

test("shows both setup fields after starting and validates before saving", async ({
  page,
}, testInfo) => {
  let saves = 0;
  await page.route("**/api/exchange", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: null });
    saves++;
    return route.fallback();
  });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Una sorpresa para compartir.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Empezar", exact: true }).click();
  const form = page.getByRole("form", { name: "Crear sorteo" });
  await expect(form.getByLabel("Nombre del sorteo")).toBeVisible();
  await expect(form.getByLabel("Presupuesto por regalo")).toBeVisible();
  await form
    .getByRole("button", { name: "Agregar participantes", exact: true })
    .click();
  await expect(form.getByLabel("Nombre del sorteo")).toBeFocused();
  await expect(form.getByRole("alert")).toBeVisible();
  expect(saves).toBe(0);
  await form.getByLabel("Nombre del sorteo").fill("Familia");
  await form.getByLabel("Presupuesto por regalo").fill("25000");
  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Una sorpresa para compartir.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Empezar", exact: true }).click();
  await expect(form.getByLabel("Nombre del sorteo")).toHaveValue("Familia");
  await expect(form.getByLabel("Presupuesto por regalo")).toHaveValue("25000");
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("setup-form.png"),
  });
});

test("keeps review reachable on long lists and sends only after explicit confirmation", async ({
  page,
}, testInfo) => {
  const people = Array.from({ length: 12 }, (_, index) => ({
    id: `person-${index}`,
    name: `Participante ${index + 1}`,
    email: `persona${index + 1}@example.com`,
  }));
  const saved = {
    id: "11111111-1111-4111-8111-111111111111",
    revision: 1,
    listName: "Familia",
    giftAmount: 25000,
    participants: people,
    status: "draft",
    delivery: { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 },
  };
  let draws = 0;
  await page.route("**/api/exchange", (route) => {
    if (route.request().method() === "POST") {
      draws++;
      return route.fulfill({
        json: {
          ...saved,
          status: "drawn",
          delivery: { ...saved.delivery, sent: people.length },
        },
      });
    }
    return route.fulfill({ json: saved });
  });
  await page.reload();
  const review = page.getByRole("button", { name: "Revisar sorteo" });
  await expect(review).toBeEnabled();
  const bounds = await review.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("participants-long-list.png"),
  });
  await review.click();
  await expect(
    page.getByRole("heading", { name: "Revisa el sorteo." }),
  ).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(12);
  await expect(
    page.getByText("ARS 25.000 por regalo", { exact: true }),
  ).toBeVisible();
  expect(draws).toBe(0);
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("review.png"),
  });
  await page.getByRole("button", { name: "Volver a participantes" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(12);
  await page.getByRole("button", { name: "Revisar sorteo" }).click();
  await page.getByRole("button", { name: "Sortear y enviar correos" }).click();
  await expect(
    page.getByRole("heading", { name: "Ya enviamos las asignaciones." }),
  ).toBeVisible();
  expect(draws).toBe(1);
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("success.png"),
  });
});

test("shows confirmed email progress and keeps the reveal in email", async ({
  page,
}, testInfo) => {
  const people = [
    { id: "person-1", name: "Ana", email: "ana@example.com" },
    { id: "person-2", name: "Beto", email: "beto@example.com" },
    { id: "person-3", name: "Caro", email: "caro@example.com" },
  ];
  const saved = {
    id: "11111111-1111-4111-8111-111111111111",
    revision: 1,
    listName: "Familia",
    participants: people,
    status: "draft",
    delivery: { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 },
  };
  const release: (() => void)[] = [];
  await page.route("**/api/exchange", async (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({ json: saved });
    const sent = release.length + 1;
    await new Promise<void>((resolve) => release.push(resolve));
    await route.fulfill({
      json: {
        ...saved,
        status: "drawn",
        delivery: { ...saved.delivery, sent, pending: 3 - sent },
      },
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Revisar sorteo" }).click();
  await page.getByRole("button", { name: "Sortear y enviar correos" }).click();
  const progress = page.getByRole("progressbar", { name: "Correos enviados" });
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await expect(progress).toHaveAttribute("aria-valuemax", "3");
  const expectCentered = async () => {
    const content = await page.locator(".assignment-content").boundingBox();
    const main = await page.getByRole("main").boundingBox();
    expect(content!.y).toBeGreaterThan(50);
    expect(
      Math.abs(content!.y + content!.height / 2 - main!.y - main!.height / 2),
    ).toBeLessThan(2);
  };
  await expectCentered();
  const scene = page.locator("[data-delivery-animation]");
  await expect(scene).toHaveAttribute("data-motion", "animated");
  const envelope = scene.locator('[data-envelope="first"]');
  const initialTransform = await envelope.getAttribute("transform");
  await expect
    .poll(() => envelope.getAttribute("transform"))
    .not.toBe(initialTransform);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene).toHaveAttribute("data-motion", "static");
  await expect(envelope).not.toHaveAttribute("transform");
  await expect(scene.locator('[data-envelope="second"]')).toHaveAttribute(
    "opacity",
    "0",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(scene).toHaveAttribute("data-motion", "animated");
  await expect.poll(() => release.length).toBe(1);
  release[0]();
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await expect(
    page.getByText("1 de 3 correos enviados.", { exact: true }),
  ).toBeVisible();
  for (const person of people)
    await expect(page.getByText(person.name, { exact: true })).toHaveCount(0);
  await page.screenshot({
    animations: "disabled",
    style: "nextjs-portal { display: none; }",
    path: testInfo.outputPath("sending-progress.png"),
  });
  await expect.poll(() => release.length).toBe(2);
  release[1]();
  await expect(progress).toHaveAttribute("aria-valuenow", "2");
  await expect.poll(() => release.length).toBe(3);
  release[2]();
  await expect(
    page.getByRole("heading", { name: "Ya enviamos las asignaciones." }),
  ).toBeVisible();
  await expect(
    page.getByText("La sorpresa está en sus correos.", { exact: true }),
  ).toBeVisible();
  await expect(progress).toHaveCount(0);
  await expect(scene).toHaveCount(0);
  await expectCentered();
});
