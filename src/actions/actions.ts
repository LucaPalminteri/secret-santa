"use server";

import nodemailer from "nodemailer";
import { shuffle } from "lodash";

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

export async function assignSecretSantas(participants: Participant[]) {
  const shuffled = shuffle(participants);
  const assignments = shuffled.map((participant, index) => ({
    santa: participant,
    recipient: shuffled[(index + 1) % shuffled.length],
  }));

  for (const assignment of assignments) {
    await sendEmail(assignment.santa.email, assignment.santa.name, assignment.recipient.name);
  }

  return { success: true };
}

async function sendEmail(to: string, santaName: string, recipientName: string) {
  const emailTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tu asignación de Secret Santa</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f0f0f0;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #c41e3a;
          text-align: center;
          font-size: 28px;
          margin-bottom: 20px;
        }
        .message {
          background-color: #f8f8f8;
          border-left: 5px solid #c41e3a;
          padding: 15px;
          margin-bottom: 20px;
        }
        .recipient {
          font-weight: bold;
          color: #006400;
          font-size: 18px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 14px;
          color: #666;
        }
        .snowflake {
          color: #c41e3a;
          font-size: 24px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1><span class="snowflake">❄️</span> ¡Tu asignación de Secret Santa! <span class="snowflake">❄️</span></h1>
        <p>¡Hola ${santaName}!</p>
        <div class="message">
          <p>Has sido asignado como el Secret Santa de:</p>
          <p class="recipient">${recipientName}</p>
        </div>
        <p>Recuerda mantener el secreto y diviértete eligiendo un regalo especial para tu persona asignada. ¡La magia de la Navidad está en dar!</p>
        <p>Algunas ideas para regalos:</p>
        <ul>
          <li>Un libro interesante</li>
          <li>Una experiencia divertida</li>
          <li>Algo hecho a mano con cariño</li>
          <li>Un accesorio útil para su hobby favorito</li>
        </ul>
        <p>¡Que tengas una feliz Navidad llena de alegría y sorpresas!</p>
        <div class="footer">
          <p>Este es un correo automático. Por favor, no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `Santa Claus <${process.env.EMAIL_USER}>`,
      to: to,
      subject: "¡Tu asignación de Secret Santa!",
      html: emailTemplate,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}
