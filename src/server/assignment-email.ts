import colors from "../brand/colors.json";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

export function assignmentEmail({
  santaName,
  recipientName,
  listName,
  giftAmount,
  siteUrl,
}: {
  santaName: string;
  recipientName: string;
  listName?: string;
  giftAmount?: number;
  siteUrl?: string;
}) {
  const budget =
    giftAmount === undefined
      ? undefined
      : `ARS ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(giftAmount)}`;
  let safeSiteUrl: string | undefined;
  try {
    const parsed = new URL(siteUrl ?? "");
    if (parsed.protocol === "https:" || parsed.protocol === "http:")
      safeSiteUrl = parsed.href;
  } catch {
    /* A site link is optional; assignments do not depend on it. */
  }

  const text = [
    `¡Hola, ${santaName}!`,
    `Te toca regalarle a: ${recipientName}`,
    listName ? `Sorteo: ${listName}` : undefined,
    budget ? `Presupuesto por regalo: ${budget}` : undefined,
    "Shhh... guarda el secreto hasta el intercambio.",
    "La magia está en sorprender a alguien con un detalle pensado para esa persona.",
    "¡Que tengas una Navidad llena de ilusión!",
    safeSiteUrl
      ? `Organizado con Secret Santa: ${safeSiteUrl}`
      : "Organizado con Secret Santa.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const detail = (label: string, value: string) =>
    `<tr><td style="padding:16px 0;border-bottom:1px solid ${colors.line}"><p style="margin:0 0 4px;font-size:13px;color:${colors.muted}">${label}</p><p style="margin:0;font-size:17px;line-height:1.5;font-weight:800;color:${colors.ink};overflow-wrap:anywhere;word-break:break-word">${escape(value)}</p></td></tr>`;

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Una sorpresa de Secret Santa</title></head>
<body style="margin:0;padding:0;background:${colors.paper};font-family:'Nunito Sans',Arial,Helvetica,sans-serif;color:${colors.ink};line-height:1.5;-webkit-text-size-adjust:100%">
  <div style="display:none;font-size:1px;line-height:1px;color:${colors.paper};max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">Tu misión navideña ya está aquí. Descubre a quién vas a sorprender y guarda el secreto.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.paper}"><tr><td align="center" style="padding:24px 12px">
    <!--[if mso]><table role="presentation" width="560" align="center"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${colors.surface};border:1px solid ${colors.line};border-radius:20px;border-spacing:0;table-layout:fixed">
      <tr><td style="padding:22px 24px;border-bottom:1px solid ${colors.line}">
        <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td style="padding-right:8px"><img src="cid:secret-santa-mark" width="26" height="26" alt="" style="display:block;border:0"></td><td style="font-size:19px;font-weight:800;color:${colors.ink}">Secret Santa</td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:28px 24px 0">
        <img src="cid:secret-santa-welcome" width="250" height="181" alt="" style="display:block;border:0;width:250px;max-width:100%;height:auto;margin:0 auto">
        <p style="margin:24px 0 8px;font-size:16px;font-weight:600;overflow-wrap:anywhere;word-break:break-word">¡Hola, ${escape(santaName)}!</p>
        <h1 style="margin:0;font-size:30px;line-height:1.18;letter-spacing:-0.6px;font-weight:800;color:${colors.ink}">La magia empieza<br>contigo.</h1>
        <p style="margin:14px 0 24px;font-size:15px;line-height:1.6;color:${colors.muted}">Esta Navidad, tienes una sorpresa que preparar.</p>
      </td></tr>
      <tr><td style="padding:0 24px">
        <!-- The ribbon crosses the paper itself; the recipient is written directly on it. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${colors.paper}" style="background:${colors.paper};table-layout:fixed">
          <colgroup><col width="40" style="width:40px"><col width="16" style="width:16px"><col width="40" style="width:40px"><col></colgroup>
          <tr>
            <td colspan="3" width="96" valign="top" style="width:96px;padding:0"><img src="cid:secret-santa-bow" width="96" height="84" alt="" style="display:block;border:0;width:96px;height:84px"></td>
            <td valign="top" style="padding:0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td height="32" style="height:32px;font-size:0;line-height:0">&nbsp;</td></tr><tr><td height="14" bgcolor="${colors.cranberry}" style="height:14px;background:${colors.cranberry};font-size:0;line-height:0">&nbsp;</td></tr><tr><td height="38" style="height:38px;font-size:0;line-height:0">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td width="40" style="width:40px;font-size:0">&nbsp;</td>
            <td width="16" bgcolor="${colors.cranberry}" style="width:16px;background:${colors.cranberry};font-size:0">&nbsp;</td>
            <td width="40" style="width:40px;font-size:0">&nbsp;</td>
            <td style="padding:0 20px 32px 8px;vertical-align:top">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${colors.muted}">Te toca regalarle a</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.15;font-style:italic;font-weight:400;color:${colors.ink};overflow-wrap:anywhere;word-break:break-word">${escape(recipientName)}</p>
            </td>
          </tr>
        </table>
        ${listName || budget ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;table-layout:fixed">${listName ? detail("Sorteo", listName) : ""}${budget ? detail("Presupuesto por regalo", budget) : ""}</table>` : ""}
        <p style="margin:22px 0 6px;text-align:center;font-size:16px;font-weight:800;color:${colors.pine}">Shhh... guarda el secreto.</p>
        <p style="margin:0 0 28px;text-align:center;font-size:14px;line-height:1.7;color:${colors.muted}">La magia está en sorprender a alguien con un detalle pensado para esa persona.</p>
      </td></tr>
      <tr><td align="center" bgcolor="${colors.pine}" style="padding:22px 24px;background:${colors.pine};border-radius:0 0 18px 18px">
        <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:${colors.surface}">Que esta Navidad<br>nos encuentre compartiendo.</p>
        <p style="margin:0;font-size:13px;color:${colors.surface}">Con ilusión, Secret Santa</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
    <p style="margin:20px 12px 0;font-size:12px;color:${colors.muted};text-align:center">Una sorpresa para compartir.<br>Organizado con ${safeSiteUrl ? `<a href="${escape(safeSiteUrl)}" style="color:${colors.pine};text-decoration:underline">Secret Santa</a>` : "Secret Santa"}.</p>
  </td></tr></table>
</body></html>`;
  return { html, text };
}
