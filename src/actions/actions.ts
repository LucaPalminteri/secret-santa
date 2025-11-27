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

  const emailTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tu Amigo Invisible</title>
<style>
  :root {
    color-scheme: light dark;
  }
  /* RESET & BASICS */
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  table { border-collapse: collapse; width: 100%; }
  
  /* COLORS */
  .text-red { color: #dc2626; }
  .text-green { color: #15803d; }
  .bg-white { background-color: #ffffff; }
  
  /* LAYOUT */
  .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }
  .main-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); font-size: 16px; line-height: 1.5; color: #374151; }
  
  /* DECORATION */
  .candy-cane-border { height: 12px; background: repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, #ffffff 10px, #ffffff 20px); }
  .header-icon { text-align: center; padding-top: 30px; padding-bottom: 10px; }
  
  /* TEXT STYLES */
  .greeting { text-align: center; font-size: 18px; color: #4b5563; margin: 0; padding: 0 20px; }
  .lead-text { text-align: center; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-top: 10px; margin-bottom: 5px; font-weight: 600; }
  
  /* HERO SECTION (The Recipient) */
  .recipient-box { background-color: #f0fdf4; border: 2px dashed #bbf7d0; border-radius: 8px; margin: 15px 30px; padding: 20px; text-align: center; }
  .recipient-name { font-size: 32px; font-weight: 800; color: #15803d; margin: 5px 0 0 0; line-height: 1.2; }
  
  /* DETAILS GRID */
  .details-grid { padding: 0 30px; margin-bottom: 20px; }
  .detail-item { display: flex; align-items: center; justify-content: center; margin-bottom: 8px; font-size: 15px; color: #4b5563; }
  .icon-small { width: 18px; height: 18px; margin-right: 8px; display: inline-block; vertical-align: text-bottom; }
  
  /* LIST */
  .participants-section { padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
  .participants-title { font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 10px; display: block; }
  .part-list { list-style: none; padding: 0; margin: 0; font-size: 14px; color: #6b7280; columns: 2; -webkit-columns: 2; }
  .part-list li { margin-bottom: 4px; padding-left: 12px; position: relative; }
  .part-list li::before { content: "•"; color: #dc2626; position: absolute; left: 0; font-weight: bold; }

  /* FOOTER */
  .footer { text-align: center; padding: 20px 30px 30px; font-size: 12px; color: #9ca3af; }
  .cta-link { color: #dc2626; text-decoration: none; font-weight: 600; }
  
  /* DARK MODE OVERRIDES */
  @media (prefers-color-scheme: dark) {
    body, .wrapper { background-color: #0f172a !important; }
    .main-container { background-color: #1e293b !important; color: #e2e8f0 !important; box-shadow: none !important; }
    .recipient-box { background-color: #14532d !important; border-color: #15803d !important; }
    .recipient-name { color: #f0fdf4 !important; }
    .greeting, .detail-item { color: #cbd5e1 !important; }
    .participants-section { background-color: #334155 !important; border-top-color: #475569 !important; }
    .participants-title { color: #e2e8f0 !important; }
    .part-list { color: #94a3b8 !important; }
    .candy-cane-border { opacity: 0.8; }
  }
</style>
</head>
<body>
  <div class="wrapper">
    <br>
    <div class="main-container">
      <div class="candy-cane-border" aria-hidden="true"></div>
      
      <div class="header-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8 2 5 5 5 9C5 11.5 6 13 7 14V16C7 17.1 7.9 18 9 18H15C16.1 18 17 17.1 17 16V14C18 13 19 11.5 19 9C19 5 16 2 12 2Z" fill="#dc2626"/>
          <circle cx="12" cy="2" r="2" fill="#ffffff" stroke="#dc2626" stroke-width="1.5"/>
          <rect x="5" y="14" width="14" height="4" rx="2" fill="#ffffff" stroke="#dc2626" stroke-width="1.5"/>
        </svg>
      </div>

      <p class="greeting">¡Hola, <strong>${santaName}</strong>!</p>
      
      <div class="lead-text">Tu misión secreta es regalar a:</div>
      
      <div class="recipient-box">
        <svg class="icon-small" style="width:24px; height:24px; color:#15803d; margin-bottom:8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 12 20 22 4 22 4 12"></polyline>
          <rect x="2" y="7" width="20" height="5"></rect>
          <line x1="12" y1="22" x2="12" y2="7"></line>
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
        </svg>
        <div class="recipient-name">${recipientName}</div>
      </div>

      <div class="details-grid">
        ${
          listName
            ? `<div class="detail-item">
                 <svg class="icon-small text-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                 <span>Evento: <strong>${listName}</strong></span>
               </div>`
            : ""
        }
        ${
          giftAmount
            ? `<div class="detail-item">
                 <svg class="icon-small text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                 <span>Presupuesto: <strong>${fmtCurrency(giftAmount)}</strong></span>
               </div>`
            : ""
        }
      </div>

      <div class="participants-section">
        <span class="participants-title">Quiénes participan</span>
        <ul class="part-list">
          ${sortedParticipants.map((p) => `<li>${p.name}</li>`).join("")}
        </ul>
      </div>

      <div class="footer">
        <div style="margin-bottom:12px">
          🤫 <em>Shhh... Este correo es secreto. No se lo muestres a nadie.</em>
        </div>
        ${
          SITE_URL
            ? `<div style="margin-bottom:12px">Organizado en: <a class="cta-link" href="${SITE_URL}" target="_blank">${SITE_URL.replace(
                /^https?:\/\//,
                ""
              )}</a></div>`
            : ""
        }
        <div>🎄 ¡Feliz Navidad y buen regalo! 🎁</div>
      </div>
    </div>
    <br>
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
