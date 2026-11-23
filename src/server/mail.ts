import "server-only";

import nodemailer from "nodemailer";
import { assignmentEmail } from "./assignment-email";
import emailImages from "../brand/email-images.json";

interface Participant {
  id: string;
  name: string;
  email: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 15_000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export class DeliveryError extends Error {
  constructor(public uncertain: boolean) {
    super("Failed to send email");
  }
}

export async function sendEmail(
  to: string,
  santaName: string,
  recipientName: string,
  _participants: Participant[],
  listName?: string,
  giftAmount?: number,
  messageId?: string,
) {
  const email = assignmentEmail({
    santaName,
    recipientName,
    listName,
    giftAmount,
    siteUrl:
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.BASE_URL,
  });

  try {
    const result = await transporter.sendMail({
      from: `"Secret Santa" <${process.env.EMAIL_USER}>`,
      to: to,
      messageId,
      subject: "Secret Santa | Tu asignación",
      html: email.html,
      text: email.text,
      attachments: [
        {
          filename: "secret-santa-bow.png",
          content: Buffer.from(emailImages.bow, "base64"),
          cid: "secret-santa-bow",
          contentDisposition: "inline",
        },
        {
          filename: "secret-santa-mark.png",
          content: Buffer.from(emailImages.mark, "base64"),
          cid: "secret-santa-mark",
          contentDisposition: "inline",
        },
        {
          filename: "secret-santa-welcome.gif",
          contentType: "image/gif",
          content: Buffer.from(emailImages.welcome, "base64"),
          cid: "secret-santa-welcome",
          contentDisposition: "inline",
        },
      ],
    });
    if (result.rejected?.length || result.accepted?.length === 0)
      throw new DeliveryError(false);
  } catch (error) {
    if (error instanceof DeliveryError) throw error;
    const failure = error as { code?: string; responseCode?: number };
    const rejected =
      (failure.responseCode ?? 0) >= 400 ||
      ["EAUTH", "EDNS", "ENOTFOUND", "EENVELOPE"].includes(failure.code ?? "");
    throw new DeliveryError(!rejected);
  }
}
