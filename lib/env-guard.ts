import { logConsole, writeAlert } from "./logger";

/**
 * Variables sans lesquelles un cron ne peut pas faire son travail en entier.
 *
 * Historique : `lib/email.ts` retournait silencieusement quand RESEND_API_KEY
 * était absente. Les crons répondaient donc `success: true` alors qu'aucun
 * email ne partait — la newsletter est restée muette en production sans
 * qu'aucune erreur ne le signale. Ces variables sont désormais vérifiées au
 * démarrage, et leur absence est une panne, pas un no-op.
 */
export const REQUIRED_CRON_ENV = [
  "DATABASE_URL",
  "STOCK_API_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
] as const;

export type RequiredEnvVar = (typeof REQUIRED_CRON_ENV)[number];

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Variables attendues qui sont absentes ou vides. */
export function missingEnv(
  vars: readonly string[] = REQUIRED_CRON_ENV
): string[] {
  return vars.filter((name) => !process.env[name]?.trim());
}

/**
 * Garde de configuration d'une route cron.
 *
 * Renvoie une réponse 500 à retourner telle quelle si la configuration est
 * incomplète en production, `null` si tout va bien.
 *
 * Hors production, l'absence est seulement loggée : on veut pouvoir lancer un
 * cron en local sans clé Resend, mais jamais laisser passer ça en prod.
 */
export function guardCronEnv(job: string): Response | null {
  const missing = missingEnv();
  if (missing.length === 0) return null;

  const message = `${job} — variables d'environnement manquantes : ${missing.join(", ")}`;

  if (!isProduction()) {
    console.warn(`[CONFIG] ${message} (toléré hors production)`);
    return null;
  }

  writeAlert("CONFIG_MISSING", message);
  logConsole({ type: "alert", alertType: "CONFIG_MISSING", message });

  return Response.json(
    {
      error: "Configuration incomplète",
      job,
      missing,
      hint: "Renseigner ces variables dans les settings Vercel puis redéployer.",
    },
    { status: 500 }
  );
}

/**
 * Signale l'absence de CRON_SECRET côté serveur.
 *
 * Sans secret, `isAuthorized` rejette tout : la route répond 401 en boucle
 * sans qu'on sache pourquoi. On log la cause sans jamais l'exposer dans la
 * réponse HTTP, qui reste un 401 nu.
 */
export function warnIfCronSecretMissing(job: string): void {
  if (process.env.CRON_SECRET?.trim()) return;
  const message = `${job} — CRON_SECRET absent : toutes les requêtes seront rejetées en 401`;
  writeAlert("CONFIG_MISSING", message);
  logConsole({ type: "alert", alertType: "CONFIG_MISSING", message });
}
