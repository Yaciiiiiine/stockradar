import { timingSafeEqual } from "node:crypto";

/**
 * Vérifie l'en-tête `Authorization: Bearer <CRON_SECRET>`.
 *
 * Utilisé par les crons Vercel (qui envoient cet en-tête automatiquement)
 * et par les routes de diagnostic.
 *
 * Si `CRON_SECRET` n'est pas défini, l'accès est refusé. Sans cette garde,
 * la comparaison littérale `auth !== "Bearer " + undefined` laissait entrer
 * quiconque envoyait exactement `Bearer undefined`.
 */
export function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = request.headers.get("authorization");
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
