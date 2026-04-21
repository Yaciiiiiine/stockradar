import { StockData } from "./mock-data";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = "StockRadar <briefing@stockradar.fr>";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  const { Resend } = require("resend");
  return new Resend(process.env.RESEND_API_KEY) as import("resend").Resend;
}

function stockRowHtml(s: StockData): string {
  const color = s.change >= 0 ? "#34c759" : "#ff3b30";
  const sign = s.change >= 0 ? "+" : "";
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #2a2a2e;">
        <div style="font-size:17px;font-weight:600;letter-spacing:-0.3px;color:#f5f5f7;">${s.ticker}</div>
        <div style="font-size:13px;color:#86868b;margin-top:2px;">${s.name}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #2a2a2e;text-align:right;font-variant-numeric:tabular-nums;">
        <div style="font-size:17px;font-weight:600;color:#f5f5f7;">${s.market === "US" ? "$" : "€"}${s.price.toFixed(2)}</div>
        <div style="font-size:13px;font-weight:600;color:${color};margin-top:2px;">${sign}${s.change.toFixed(2)}%</div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #2a2a2e;font-size:13px;color:#86868b;line-height:1.5;max-width:300px;">${s.reason}</td>
    </tr>
  `;
}

function baseTemplate(previewText: string, content: string, unsubToken: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StockRadar</title>
</head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="padding-bottom:40px;">
        <div style="font-size:28px;font-weight:700;letter-spacing:-1px;color:#f5f5f7;">StockRadar<span style="font-size:11px;font-weight:500;color:#86868b;letter-spacing:0;margin-left:8px;vertical-align:middle;border:1px solid #3a3a3e;border-radius:4px;padding:2px 6px;">Beta</span></div>
      </td></tr>
      ${content}
      <tr><td style="padding-top:40px;border-top:1px solid #2a2a2e;">
        <p style="font-size:12px;color:#48484a;line-height:1.6;margin:0;">
          StockRadar est un outil d'information. Ceci n'est pas un conseil en investissement. Faites vos propres recherches.<br><br>
          <a href="${APP_URL}/api/unsubscribe?token=${unsubToken}" style="color:#86868b;text-decoration:underline;">Se désabonner</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendConfirmationEmail(email: string, token: string) {
  const resend = getResend();
  if (!resend) return;
  const link = `${APP_URL}/api/confirm?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Confirmez votre inscription — StockRadar",
    html: baseTemplate(
      "Un lien pour confirmer votre abonnement à StockRadar",
      `<tr><td style="padding:40px 0;text-align:center;">
        <h1 style="font-size:32px;font-weight:700;letter-spacing:-1px;color:#f5f5f7;margin:0 0 16px;">Confirmez votre abonnement</h1>
        <p style="font-size:17px;color:#86868b;line-height:1.6;margin:0 0 32px;">Bienvenue sur StockRadar. Cliquez ci-dessous pour recevoir chaque jour les 10 actions FR et US à surveiller.</p>
        <a href="${link}" style="display:inline-block;background:#f5f5f7;color:#000;font-size:15px;font-weight:600;padding:14px 28px;border-radius:980px;text-decoration:none;">Confirmer mon inscription</a>
      </td></tr>`,
      token
    ),
  });
}

export async function sendMorningBrief(
  emails: string[],
  tokens: Map<string, string>,
  date: string,
  frStocks: StockData[],
  usStocks: StockData[]
) {
  const resend = getResend();
  if (!resend) return;

  const frRows = frStocks.map(stockRowHtml).join("");
  const usRows = usStocks.map(stockRowHtml).join("");

  for (const email of emails) {
    const token = tokens.get(email) ?? "";
    const html = baseTemplate(
      `Briefing matinal — ${date} — 10 FR + 10 US à surveiller`,
      `<tr><td>
        <h1 style="font-size:36px;font-weight:700;letter-spacing:-1.5px;color:#f5f5f7;margin:0 0 8px;">Briefing matinal</h1>
        <p style="font-size:15px;color:#86868b;margin:0 0 40px;">${date}</p>
        <h2 style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#f5f5f7;margin:0 0 20px;">Marché Français</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${frRows}</table>
        <h2 style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#f5f5f7;margin:40px 0 20px;">Marché Américain</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${usRows}</table>
      </td></tr>`,
      token
    );
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `StockRadar — Briefing matinal ${date}`,
      html,
    });
  }
}

export async function sendEveningRecap(
  emails: string[],
  tokens: Map<string, string>,
  date: string,
  frStocks: StockData[],
  usStocks: StockData[],
  summary: string
) {
  const resend = getResend();
  if (!resend) return;

  const frRows = frStocks.map(stockRowHtml).join("");
  const usRows = usStocks.map(stockRowHtml).join("");

  for (const email of emails) {
    const token = tokens.get(email) ?? "";
    const html = baseTemplate(
      `Compte-rendu du soir — ${date}`,
      `<tr><td>
        <h1 style="font-size:36px;font-weight:700;letter-spacing:-1.5px;color:#f5f5f7;margin:0 0 8px;">Compte-rendu du soir</h1>
        <p style="font-size:15px;color:#86868b;margin:0 0 32px;">${date}</p>
        <div style="background:#1c1c1e;border-radius:16px;padding:24px;margin-bottom:40px;">
          <p style="font-size:15px;color:#86868b;line-height:1.7;margin:0;">${summary}</p>
        </div>
        <h2 style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#f5f5f7;margin:0 0 20px;">Performance — Marché Français</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${frRows}</table>
        <h2 style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#f5f5f7;margin:40px 0 20px;">Performance — Marché Américain</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${usRows}</table>
      </td></tr>`,
      token
    );
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `StockRadar — Compte-rendu ${date}`,
      html,
    });
  }
}
