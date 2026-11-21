import { beforeEach, describe, expect, it, vi } from "vitest";
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));
import { DeliveryError, sendEmail } from "../../src/server/mail";

beforeEach(() => { sendMail.mockReset().mockResolvedValue({ accepted: ["a@example.com"], rejected: [] }); });

describe("email notifications", () => {
  it("escapes user text and includes the list, zero budget, and stable message ID", async () => {
    await sendEmail("a@example.com", "<script>A</script>", "B & C", [{ id: "1", name: "<img>", email: "a@example.com" }], "<b>Party</b>", 0, "<stable@example.invalid>");
    const mail = sendMail.mock.calls[0][0];
    expect(mail.html).toContain("&lt;script&gt;A&lt;/script&gt;");
    expect(mail.html).toContain("B &amp; C");
    expect(mail.html).toContain("&lt;img&gt;");
    expect(mail.html).toContain("&lt;b&gt;Party&lt;/b&gt;");
    expect(mail.html).toContain("Presupuesto:");
    expect(mail.messageId).toBe("<stable@example.invalid>");
  });
  it("reports explicit SMTP rejection as a retryable failure", async () => {
    sendMail.mockRejectedValue({ responseCode: 550 });
    await expect(sendEmail("a@example.com", "A", "B", [])).rejects.toMatchObject({ uncertain: false });
  });
  it("does not treat rejected recipients as successful delivery", async () => {
    sendMail.mockResolvedValue({ rejected: ["a@example.com"] });
    await expect(sendEmail("a@example.com", "A", "B", [])).rejects.toBeInstanceOf(DeliveryError);
  });
  it("marks timeouts as uncertain because SMTP might already have accepted the email", async () => {
    sendMail.mockRejectedValue({ code: "ETIMEDOUT" });
    await expect(sendEmail("a@example.com", "A", "B", [])).rejects.toMatchObject({ uncertain: true });
  });
});
