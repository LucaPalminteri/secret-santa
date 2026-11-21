import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Participant } from "../../src/utils/types";

// Replace both external boundaries before importing the server action.
// These tests cannot query DNS or send email and require no credentials.
const { sendMail, resolveMx } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  resolveMx: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
vi.mock("dns/promises", () => ({ default: { resolveMx } }));

import { assignSecretSantas } from "../../src/actions/actions";

function participants(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `person-${i}`,
    name: `Person ${i}`,
    email: `person${i}@example.com`,
  }));
}

describe("Secret Santa assignment", () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({ messageId: "test-message" });
    resolveMx.mockReset().mockResolvedValue([{ exchange: "mail.example.com", priority: 10 }]);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("BASE_URL", "");
  });

  it.each([0, 1, 2])("rejects %i participants without contacting external services", async (count) => {
    await expect(assignSecretSantas(participants(count))).rejects.toThrow("al menos 3 participantes");
    expect(resolveMx).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it.each([3, 4, 10])("assigns %i participants once each, without self-assignment", async (count) => {
    const people = participants(count);
    await expect(assignSecretSantas(people)).resolves.toEqual({ success: true });
    expect(sendMail).toHaveBeenCalledTimes(count);

    const emails = sendMail.mock.calls.map(([mail]) => mail as { to: string; html: string });
    expect(emails.map((mail) => mail.to).sort()).toEqual(people.map((person) => person.email).sort());

    // Inspect the recipient each sender actually receives, independent of shuffle order.
    const recipients = emails.map((mail) => {
      const recipient = mail.html.match(/<div class="recipient-name">([^<]+)<\/div>/)?.[1];
      const sender = people.find((person) => person.email === mail.to)!;
      expect(recipient).toBeDefined();
      expect(recipient).not.toBe(sender.name);
      return recipient;
    });
    expect(recipients.sort()).toEqual(people.map((person) => person.name).sort());
  });

  it("does not mutate the caller's participant order", async () => {
    const people = participants(3).reverse();
    const original = structuredClone(people);
    await assignSecretSantas(people);
    expect(people).toEqual(original);
  });

  it("includes list details in each notification", async () => {
    await assignSecretSantas(participants(3), "Oficina", 25000);
    for (const [mail] of sendMail.mock.calls) {
      expect(mail.html).toContain("Evento: <strong>Oficina</strong>");
      expect(mail.html).toContain("Presupuesto:");
      expect(mail.html).toContain("25.000");
    }
  });

  it("omits optional details when they are not supplied", async () => {
    await assignSecretSantas(participants(3));
    for (const [mail] of sendMail.mock.calls) {
      expect(mail.html).not.toContain("Evento:");
      expect(mail.html).not.toContain("Presupuesto:");
    }
  });

  it("does not attempt delivery to a domain without MX records", async () => {
    resolveMx.mockResolvedValue([]);
    await assignSecretSantas(participants(3));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("does not attempt delivery when DNS fails", async () => {
    resolveMx.mockRejectedValue(new Error("DNS unavailable"));
    await assignSecretSantas(participants(3));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("propagates email delivery failures instead of reporting success", async () => {
    sendMail.mockRejectedValue(new Error("SMTP unavailable"));
    await expect(assignSecretSantas(participants(3))).rejects.toThrow("Failed to send email");
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
