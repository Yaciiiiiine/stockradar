const PARIS_TZ = "Europe/Paris";

/**
 * Les schedules déclarés dans vercel.json, avec l'heure de Paris visée.
 *
 * Vercel n'accepte que des expressions cron en UTC — il n'y a aucun moyen
 * d'y déclarer un fuseau. Une heure UTC fixe se traduit donc par deux heures
 * de Paris différentes selon la saison :
 *
 *   - heure d'hiver (CET,  UTC+1) : 06:00 UTC → 07:00 Paris
 *   - heure d'été   (CEST, UTC+2) : 06:00 UTC → 08:00 Paris
 *
 * Les valeurs actuelles sont calées sur l'heure d'été. En hiver, les deux
 * crons partent une heure trop tôt. `logCronStart` le signale dans les logs
 * plutôt que de le corriger silencieusement : le seul vrai correctif est de
 * changer vercel.json deux fois par an.
 */
export const CRON_SCHEDULES = {
  "morning-brief": { utc: "0 6 * * 1-5", parisTarget: "08:00" },
  "evening-recap": { utc: "30 20 * * 1-5", parisTarget: "22:30" },
} as const;

export type CronJob = keyof typeof CRON_SCHEDULES;

/** Décalage Paris↔UTC en heures à la date donnée : 1 en hiver, 2 en été. */
export function parisOffsetHours(date: Date = new Date()): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;

  const match = label ? /GMT([+-]\d{1,2})/.exec(label) : null;
  return match ? Number(match[1]) : 1;
}

/** Heure locale de Paris formatée, ex. "25/07/2026 08:03". */
export function parisTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/**
 * Garde de démarrage : log l'heure de Paris effective et prévient quand le
 * schedule UTC ne tombe plus sur l'heure visée (bascule été/hiver).
 *
 * Ne bloque jamais l'exécution — c'est un signal de log, pas un contrôle.
 */
export function logCronStart(job: CronJob, now: Date = new Date()): void {
  const { utc, parisTarget } = CRON_SCHEDULES[job];
  const offset = parisOffsetHours(now);
  const season = offset === 2 ? "heure d'été" : "heure d'hiver";

  const [utcMinute, utcHour] = utc.split(" ");
  const scheduledParisHour = (Number(utcHour) + offset) % 24;
  const scheduled = `${String(scheduledParisHour).padStart(2, "0")}:${utcMinute.padStart(2, "0")}`;

  console.log(
    `[CRON] ${job} — démarrage ${parisTime(now)} (${PARIS_TZ}, UTC+${offset}, ${season})`
  );

  if (scheduled !== parisTarget) {
    console.warn(
      `[CRON] ${job} — DÉCALAGE : "${utc}" UTC tombe à ${scheduled} Paris, ` +
        `la cible est ${parisTarget}. Corriger vercel.json (voir README).`
    );
  }
}
