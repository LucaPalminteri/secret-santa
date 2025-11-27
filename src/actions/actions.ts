"use server";

import nodemailer from "nodemailer";
import { shuffle } from "lodash";
import dns from "dns/promises";

interface Participant {
  id: string;
  name: string;
  email: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function validateEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords.length > 0;
  } catch (error) {
    console.error(`Failed to validate email domain for ${email}:`, error);
    return false;
  }
}

async function sendEmail(to: string, santaName: string, recipientName: string, participants: Participant[], listName?: string, giftAmount?: number) {
  const sortedParticipants = participants.sort((a, b) => a.name.localeCompare(b.name));
  const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || "";

  const fmtCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "";
    try {
      return new Intl.NumberFormat("es-ES", { style: "currency", currency: "ARS" }).format(amount);
    } catch {
      return `$${amount}`;
    }
  };

  const emailTemplate = `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      :root{color-scheme: light dark}
      /* Email-friendly, minimal festive styles */
      body{font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; background:#ffffff;margin:0;padding:28px;color:#0f172a}
      .container{max-width:640px;margin:0 auto;padding:0 12px}
      .header{display:flex;justify-content:center;align-items:center;margin-bottom:10px}
      .greeting{font-size:15px;color:#374151;margin:0 0 8px}
      .lead{font-size:13px;color:#6b7280;margin:6px 0}
      .recipient{font-size:36px;line-height:1;margin:6px 0 14px;font-weight:800;color:#0b6b3a}
      .meta{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
      .pill{display:inline-block;background:transparent;border-radius:20px;padding:6px 10px;border:1px solid #eef2f7;color:#374151;font-size:13px}
      .participants{font-size:14px;color:#374151;margin:12px 0}
      .ideas{font-size:14px;color:#374151;margin:12px 0}
      .divider{height:1px;background:#f1f5f9;margin:20px 0;border-radius:1px}
      .footer{margin-top:18px;padding-top:12px;font-size:13px;color:#6b7280;text-align:left}
      .cta-link{color:#b91c1c;text-decoration:none;font-weight:600}
      @media (prefers-color-scheme: dark){body{background:#041226;color:#e6eef8}.pill{border-color:#0b1720}}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h2 style="font-size:15px;margin:0;color:#0f172a;">Secret Santa</h2></div>

      <p class="greeting">Hola ${santaName},</p>

      <div class="lead">Tu persona asignada es:</div>
      <div class="recipient">${recipientName}</div>

      ${listName ? `<div class="meta"><div class="pill">Evento: ${listName}</div></div>` : ""}
      ${giftAmount ? `<div class="meta"><div class="pill">Monto orientativo: ${fmtCurrency(giftAmount)}</div></div>` : ""}

      <div class="participants">
        <strong>Participantes</strong>
        <div style="margin-top:8px">${sortedParticipants.map((p) => `<div>${p.name}</div>`).join("")}</div>
      </div>

      <div class="ideas">
        <strong>Ideas rápidas</strong>
        <ul style="margin-top:8px;padding-left:18px;margin-bottom:0">
          <li>Un libro significativo</li>
          <li>Una pequeña experiencia</li>
          <li>Algo hecho a mano con cariño</li>
        </ul>
      </div>

      <div class="divider" aria-hidden></div>

      <div class="footer">
        <div style="margin-bottom:8px">Este correo contiene solo tu asignación — por favor, no lo compartas.</div>
        ${
          SITE_URL
            ? `<div style="margin-bottom:8px">Si quieres crear este sorteo, visita mi página: <a class="cta-link" href="${SITE_URL}" target="_blank" rel="noopener noreferrer">${SITE_URL.replace(
                /^https?:\/\//,
                ""
              )}</a></div>`
            : ""
        }
        <div style="font-size:12px;color:#9ca3af">Mensaje automático — no respondas este correo</div>
      </div>
    </div>
  </body>
  </html>`;

  try {
    await transporter.sendMail({
      from: `"Secret Santa" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: "Secret Santa | Tu asignación",
      html: emailTemplate,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

export async function assignSecretSantas(participants: Participant[], listName?: string, giftAmount?: number) {
  const shuffled = shuffle(participants);
  const assignments = shuffled.map((participant, index) => ({
    santa: participant,
    recipient: shuffled[(index + 1) % shuffled.length],
  }));

  for (const assignment of assignments) {
    const isValidEmail = await validateEmail(assignment.santa.email);
    if (!isValidEmail) {
      console.log(`Invalid email: ${assignment.santa.email}`);
      console.error(`Invalid email: ${assignment.santa.email}`);
      continue;
    }

    console.log(`Sending email to ${assignment.santa.email}`);

    await sendEmail(assignment.santa.email, assignment.santa.name, assignment.recipient.name, participants, listName, giftAmount);
  }

  return { success: true };
}
