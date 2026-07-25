import { randomBytes } from "node:crypto";

/**
 * Jeton de désinscription — l'unique secret qui autorise la suppression d'un
 * abonné sans authentification. Il voyage dans les liens des emails, donc il
 * doit être imprévisible.
 */

const TOKEN_BYTES = 32;
const TOKEN_RE = /^[0-9a-f]{64}$/;

/**
 * Jetons historiques : jusqu'à juillet 2026 le champ `token` était rempli par
 * le `@default(cuid())` de Prisma. Ces abonnés existent toujours en base et
 * leurs liens de désinscription doivent continuer de fonctionner — refuser ce
 * format casserait un droit RGPD pour les inscrits d'avant la bascule.
 */
const LEGACY_CUID_RE = /^c[a-z0-9]{20,31}$/;

/** Génère un jeton aléatoire de 256 bits, encodé en hexadécimal. */
export function generateUnsubscribeToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Valide la *forme* du jeton, avant toute requête en base.
 *
 * Ne dit rien de son existence : c'est un filtre qui écarte les valeurs
 * manifestement invalides (vide, tronquée, injection) sans toucher la base.
 */
export function isValidUnsubscribeToken(token: unknown): token is string {
  if (typeof token !== "string") return false;
  return TOKEN_RE.test(token) || LEGACY_CUID_RE.test(token);
}

/** true si le jeton vient de l'ancien schéma cuid. */
export function isLegacyUnsubscribeToken(token: string): boolean {
  return !TOKEN_RE.test(token) && LEGACY_CUID_RE.test(token);
}

/** Lien de désinscription absolu à insérer dans un email. */
export function buildUnsubscribeUrl(token: string, appUrl: string): string {
  const base = appUrl.replace(/\/+$/, "");
  return `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Extrait le jeton d'un lien de désinscription, ou null s'il est absent. */
export function extractUnsubscribeToken(url: string): string | null {
  try {
    return new URL(url).searchParams.get("token");
  } catch {
    return null;
  }
}
