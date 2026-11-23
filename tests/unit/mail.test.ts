import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
import { DeliveryError, sendEmail } from "../../src/server/mail";

beforeEach(() => {
  sendMail
    .mockReset()
    .mockResolvedValue({ accepted: ["a@example.com"], rejected: [] });
});

describe("email notifications", () => {
  it("escapes user text and includes the list, zero budget, and stable message ID", async () => {
    await sendEmail(
      "a@example.com",
      "<script>A</script>",
      "B & C",
      [{ id: "1", name: "<img>", email: "a@example.com" }],
      "<b>Party</b>",
      0,
      "<stable@example.invalid>",
    );
    const mail = sendMail.mock.calls[0][0];
    expect(mail.html).toContain("&lt;script&gt;A&lt;/script&gt;");
    expect(mail.html).toContain("B &amp; C");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;b&gt;Party&lt;/b&gt;");
    expect(mail.html).toContain("Presupuesto por regalo");
    expect(mail.text).toContain("ARS 0");
    expect(mail.messageId).toBe("<stable@example.invalid>");
  });
  it("embeds the shared artwork and keeps the assignment readable without images", async () => {
    await sendEmail("a@example.com", "Ana", "María", []);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.text).toContain("Te toca regalarle a: María");
    expect(mail.html).toContain("María");
    expect(mail.html).not.toContain("<svg");
    expect(mail.html).not.toContain("Presupuesto por regalo");
    expect(mail.html).not.toContain("undefined");
    expect(mail.attachments).toHaveLength(3);
    for (const attachment of mail.attachments) {
      expect(mail.html).toContain(`cid:${attachment.cid}`);
      if (attachment.cid !== "secret-santa-welcome") {
        expect(attachment.content.subarray(0, 8).toString("hex")).toBe(
          "89504e470d0a1a0a",
        );
      }
    }
    const welcome = mail.attachments.find(
      (attachment: { cid: string }) => attachment.cid === "secret-santa-welcome",
    );
    expect(welcome).toMatchObject({
      filename: "secret-santa-welcome.gif",
      contentType: "image/gif",
      contentDisposition: "inline",
    });
    const animation = await sharp(welcome.content, { animated: true }).metadata();
    expect(animation).toMatchObject({ format: "gif", loop: 1 });
    expect(animation.pages).toBeGreaterThan(1);
  });
  it("reports explicit SMTP rejection as a retryable failure", async () => {
    sendMail.mockRejectedValue({ responseCode: 550 });
    await expect(
      sendEmail("a@example.com", "A", "B", []),
    ).rejects.toMatchObject({ uncertain: false });
  });
  it("does not treat rejected recipients as successful delivery", async () => {
    sendMail.mockResolvedValue({ rejected: ["a@example.com"] });
    await expect(
      sendEmail("a@example.com", "A", "B", []),
    ).rejects.toBeInstanceOf(DeliveryError);
  });
  it("marks timeouts as uncertain because SMTP might already have accepted the email", async () => {
    sendMail.mockRejectedValue({ code: "ETIMEDOUT" });
    await expect(
      sendEmail("a@example.com", "A", "B", []),
    ).rejects.toMatchObject({ uncertain: true });
  });
});
