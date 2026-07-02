import { EVENT } from "./config";
import { EVENT_THEME } from "./event-theme";

export type EmailRow = { label: string; value: string };

type AgencyEmailOptions = {
  title: string;
  subtitle?: string;
  rows: EmailRow[];
  ref?: string;
};

/**
 * Enveloppe HTML aux couleurs de l'événement (taupe-or).
 * Compatible clients mail : styles inline, mise en page simple.
 */
export function agencyEmailHtml({ title, subtitle, rows, ref }: AgencyEmailOptions): string {
  const C = EVENT_THEME;
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;vertical-align:top;width:38%;">${r.label}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};color:${C.ink};font-size:15px;vertical-align:top;">${r.value}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.paper};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">
        <tr>
          <td style="background:${C.accent};padding:28px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${C.goldLight};">${EVENT.title}</p>
            <h1 style="margin:0;font-size:24px;font-weight:400;color:${C.white};line-height:1.3;">${title}</h1>
            ${subtitle ? `<p style="margin:10px 0 0;font-size:13px;color:${C.onDarkMuted};">${subtitle}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
            ${ref ? `<p style="margin:20px 0 0;font-size:11px;color:${C.muted};letter-spacing:0.06em;">Réf. ${ref}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:${C.cream};padding:16px 32px;text-align:center;border-top:1px solid ${C.line};">
            <p style="margin:0;font-size:12px;color:${C.muted};">${EVENT.agencyName}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
