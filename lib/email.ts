import { Resend } from "resend";
import { StockData } from "./mock-data";
import { AMF_DISCLAIMER } from "./legal";
import { buildUnsubscribeUrl } from "./unsubscribe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Expéditeur des emails.
 *
 * ⚠️ `stockradar.fr` n'est pas un domaine vérifié chez Resend — il n'est même
 * pas enregistré. Resend refuse en 403 tout envoi depuis un domaine qu'on ne
 * lui a pas prouvé, donc l'ancienne valeur `briefing@stockradar.fr` aurait
 * échoué à chaque envoi, y compris une fois RESEND_API_KEY posée.
 *
 * `onboarding@resend.dev` est le domaine de test fourni par Resend. Il
 * fonctionne sans vérification, mais n'autorise l'envoi que vers l'adresse du
 * titulaire du compte Resend — suffisant pour valider la chaîne, pas pour
 * diffuser la newsletter.
 *
 * Pour envoyer à de vrais abonnés : vérifier un domaine sur resend.com
 * (enregistrements DNS), puis remettre une adresse de ce domaine ici.
 * Voir docs/BLOCKERS.md.
 */
const FROM = "StockRadar <onboarding@resend.dev>";

/**
 * Levée quand une clé d'API requise pour envoyer est absente.
 *
 * Auparavant `getResend()` renvoyait `null` et les fonctions d'envoi
 * retournaient sans rien faire : les crons concluaient `success: true` sans
 * qu'un seul email parte. Une configuration incomplète est une panne, elle
 * doit remonter.
 */
export class MissingApiKeyError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`${variable} absente — aucun email ne peut être envoyé.`);
    this.name = "MissingApiKeyError";
    this.variable = variable;
  }
}

/** Levée quand l'API Resend refuse un envoi unitaire. */
export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

/** Compte-rendu d'une campagne d'envoi. Sans adresse : voir ARCHITECTURE.md (pas de PII dans les logs). */
export interface SendSummary {
  /** Destinataires que l'on a tenté de joindre. */
  targeted: number;
  sent: number;
  failed: number;
  /** Messages d'erreur distincts, sans adresse email. */
  errors: string[];
}

function emptySummary(targeted: number): SendSummary {
  return { targeted, sent: 0, failed: 0, errors: [] };
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MissingApiKeyError("RESEND_API_KEY");
  return new Resend(key);
}

/**
 * Envoie un lot et compte les succès et les échecs, sans jamais logger d'adresse.
 *
 * ⚠️ `resend.emails.send()` ne rejette pas quand l'API refuse l'envoi : elle
 * résout avec `{ data: null, error: {...} }`. Quota dépassé, clé invalide,
 * domaine d'expédition non vérifié — tout ça passait pour un succès. Le retour
 * doit être inspecté, un try/catch seul ne suffit pas.
 */
async function sendBatch(
  emails: string[],
  build: (email: string) => { subject: string; html: string }
): Promise<SendSummary> {
  const summary = emptySummary(emails.length);
  if (emails.length === 0) return summary;

  // Lève si la clé manque : l'appelant décide quoi en faire.
  const resend = getResend();

  for (const email of emails) {
    const { subject, html } = build(email);
    try {
      const result = await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html,
      });

      if (result?.error) {
        recordFailure(summary, `${result.error.name}: ${result.error.message}`);
      } else {
        summary.sent++;
      }
    } catch (err) {
      recordFailure(summary, err instanceof Error ? err.message : String(err));
    }
  }

  return summary;
}

function recordFailure(summary: SendSummary, message: string): void {
  summary.failed++;
  if (!summary.errors.includes(message)) summary.errors.push(message);
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
        <p style="font-size:12px;color:#48484a;line-height:1.6;margin:0 0 16px;">
          ${AMF_DISCLAIMER}
        </p>
        <p style="font-size:12px;color:#48484a;line-height:1.6;margin:0;">
          <a href="${APP_URL}/mentions-legales" style="color:#86868b;text-decoration:underline;">Mentions légales</a>
          &nbsp;·&nbsp;
          <a href="${APP_URL}/confidentialite" style="color:#86868b;text-decoration:underline;">Confidentialité</a>
          &nbsp;·&nbsp;
          <a href="${buildUnsubscribeUrl(unsubToken, APP_URL)}" style="color:#86868b;text-decoration:underline;">Se désabonner</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Lève MissingApiKeyError si RESEND_API_KEY est absente, et EmailSendError si
 * l'API refuse l'envoi. Sans ce message, le double opt-in ne peut pas aboutir :
 * l'échec doit remonter à l'appelant.
 */
export async function sendConfirmationEmail(email: string, token: string) {
  const resend = getResend();
  const link = `${APP_URL}/api/confirm?token=${token}`;
  const result = await resend.emails.send({
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

  if (result?.error) {
    throw new EmailSendError(
      `${result.error.name}: ${result.error.message}`
    );
  }
}

/** Rend le HTML du briefing matinal. Extrait de l'envoi pour être testable. */
export function renderMorningBrief(
  date: string,
  frStocks: StockData[],
  usStocks: StockData[],
  unsubToken: string
): string {
  const frRows = frStocks.map(stockRowHtml).join("");
  const usRows = usStocks.map(stockRowHtml).join("");

  return baseTemplate(
    `Briefing matinal — ${date} — 10 FR + 10 US à surveiller`,
    `<tr><td>
        <h1 style="font-size:36px;font-weight:700;letter-spacing:-1.5px;color:#f5f5f7;margin:0 0 8px;">Briefing matinal</h1>
        <p style="font-size:15px;color:#86868b;margin:0 0 40px;">${date}</p>
        <h2 style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#f5f5f7;margin:0 0 20px;">Marché Français</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${frRows}</table>
        <h2 style="font-size:20px;font-weight:600;letter-spacing:-0.5px;color:#f5f5f7;margin:40px 0 20px;">Marché Américain</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${usRows}</table>
      </td></tr>`,
    unsubToken
  );
}

/** Lève MissingApiKeyError si RESEND_API_KEY est absente et qu'il y a des destinataires. */
export async function sendMorningBrief(
  emails: string[],
  tokens: Map<string, string>,
  date: string,
  frStocks: StockData[],
  usStocks: StockData[]
): Promise<SendSummary> {
  return sendBatch(emails, (email) => ({
    subject: `StockRadar — Briefing matinal ${date}`,
    html: renderMorningBrief(date, frStocks, usStocks, tokens.get(email) ?? ""),
  }));
}

/** Rend le HTML du compte-rendu du soir. Extrait de l'envoi pour être testable. */
export function renderEveningRecap(
  date: string,
  frStocks: StockData[],
  usStocks: StockData[],
  summary: string,
  unsubToken: string
): string {
  const frRows = frStocks.map(stockRowHtml).join("");
  const usRows = usStocks.map(stockRowHtml).join("");

  return baseTemplate(
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
    unsubToken
  );
}

/** Lève MissingApiKeyError si RESEND_API_KEY est absente et qu'il y a des destinataires. */
export async function sendEveningRecap(
  emails: string[],
  tokens: Map<string, string>,
  date: string,
  frStocks: StockData[],
  usStocks: StockData[],
  summary: string
): Promise<SendSummary> {
  return sendBatch(emails, (email) => ({
    subject: `StockRadar — Compte-rendu ${date}`,
    html: renderEveningRecap(
      date,
      frStocks,
      usStocks,
      summary,
      tokens.get(email) ?? ""
    ),
  }));
}
