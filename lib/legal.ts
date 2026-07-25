/**
 * Informations légales du site.
 *
 * ⚠️ TODO — CHAMPS À COMPLÉTER AVANT TOUTE MISE EN LIGNE PUBLIQUE
 *
 * Les entrées valant `null` ci-dessous sont obligatoires au titre de
 * l'article 6-III de la LCEN (mentions légales) et de l'article 13 du RGPD
 * (information de la personne concernée). Tant qu'elles sont nulles, les
 * pages /mentions-legales et /confidentialite affichent un encart rouge
 * « à compléter » à leur place — le site reste publiable, mais l'omission
 * est visible plutôt que silencieuse.
 *
 * `npm run audit` (scripts/audit-project.mjs) signale également les champs
 * restants.
 */
export const LEGAL = {
  /** Nom et prénom (entrepreneur individuel) ou raison sociale. */
  editorName: null as string | null,
  /** Ex. « entrepreneur individuel », « SASU au capital de 1 000 € ». */
  editorLegalForm: null as string | null,
  /** Adresse postale complète du siège / du domicile déclaré. */
  editorAddress: null as string | null,
  /** Numéro SIREN (9 chiffres) ou SIRET (14 chiffres). */
  editorSiren: null as string | null,
  /**
   * Numéro de TVA intracommunautaire.
   * Facultatif si l'éditeur est en franchise en base de TVA.
   */
  editorVat: null as string | null,
  /** Directeur de la publication (art. 6-III-1 LCEN). */
  publicationDirector: null as string | null,
  /** Adresse de contact — sert aussi de canal d'exercice des droits RGPD. */
  contactEmail: null as string | null,
} as const;

/** Hébergeur — Vercel, pas de TODO : c'est factuel. */
export const HOST = {
  name: "Vercel Inc.",
  address: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
  url: "https://vercel.com",
} as const;

/**
 * Avertissement AMF. Le site diffuse de l'information sur des instruments
 * financiers sans être agréé : la mention doit être explicite et visible.
 */
export const AMF_DISCLAIMER =
  "StockRadar n'est pas un prestataire de services d'investissement ni un " +
  "conseiller en investissement au sens du Code monétaire et financier ; " +
  "les informations diffusées sont purement informatives et ne constituent " +
  "pas une recommandation d'investissement.";

/**
 * Durée maximale de conservation d'une inscription jamais confirmée, en mois.
 *
 * ⚠️ TODO — aucune tâche de purge n'existe encore. Aujourd'hui, un abonné
 * `verified: false` reste en base indéfiniment. La page /confidentialite
 * annonce cette durée : tant que la purge n'est pas implémentée, le texte
 * décrit une politique que le code n'applique pas.
 *
 * À implémenter : suppression des Subscriber non vérifiés dont `createdAt`
 * dépasse cette durée, par exemple dans le cron du matin.
 */
export const UNCONFIRMED_RETENTION_MONTHS = 12;

/** Date de dernière révision des textes légaux. */
export const LEGAL_LAST_UPDATED = "2026-07-25";

/** Liste des champs obligatoires encore vides. */
export function missingLegalFields(): string[] {
  const required: Array<[keyof typeof LEGAL, string]> = [
    ["editorName", "nom / raison sociale de l'éditeur"],
    ["editorLegalForm", "forme juridique"],
    ["editorAddress", "adresse postale"],
    ["editorSiren", "SIREN / SIRET"],
    ["publicationDirector", "directeur de la publication"],
    ["contactEmail", "email de contact"],
  ];
  return required.filter(([key]) => !LEGAL[key]).map(([, label]) => label);
}
