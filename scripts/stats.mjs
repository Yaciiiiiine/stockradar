#!/usr/bin/env node
/**
 * Statistiques de la base — remplace Prisma Studio, inutilisable sur un
 * serveur headless (il tente un `xdg-open` qui n'existe pas).
 *
 *   npm run stats
 *   DATABASE_URL="postgres://..." npm run stats   # cibler une autre base
 *
 * Lecture seule : uniquement des count, groupBy et findFirst.
 *
 * Le client Prisma est généré en TypeScript avec des imports sans extension
 * (moduleResolution "bundler"). Node ne sait pas les résoudre seul, d'où le
 * chargement via jiti.
 */

import "dotenv/config";
import { createJiti } from "jiti";
import { PrismaPg } from "@prisma/adapter-pg";

const C = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const dim = (s) => `${C.gray}${s}${C.reset}`;

/**
 * Réduit une erreur Prisma à une ligne lisible.
 *
 * Leurs messages commencent par des sauts de ligne et répètent l'invocation :
 * prendre la première ligne renvoie une chaîne vide. La dernière ligne non
 * vide porte la cause réelle.
 */
function briefError(err) {
  const raw = typeof err?.message === "string" ? err.message : "";
  const all = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Écarte l'en-tête « Invalid `prisma.x.y()` invocation: », qui n'apprend rien —
  // sauf quand c'est tout ce qu'on a, auquel cas mieux vaut ça que rien.
  const useful = all.filter((l) => !/^Invalid `.*` invocation:?$/.test(l));
  const detail = useful.at(-1) ?? all.at(-1) ?? err?.name ?? "erreur inconnue";
  return err?.code ? `[${err.code}] ${detail}` : detail;
}

function fail(message, hint) {
  console.error(`\n${C.red}${message}${C.reset}`);
  if (hint) console.error(dim(hint));
  console.error("");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  fail(
    "DATABASE_URL n'est pas défini.",
    "Renseigner .env à la racine, ou passer la variable en ligne de commande."
  );
}

const jiti = createJiti(import.meta.url);
const { PrismaClient } = await jiti.import("../lib/generated/prisma/client.ts");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Formate une Date en date+heure locale française, ou un tiret si absente. */
function stamp(date) {
  if (!date) return dim("—");
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Nombre de jours entiers écoulés depuis `date`. */
function daysAgo(date) {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function ago(date) {
  const d = daysAgo(date);
  if (d === null) return "";
  if (d === 0) return dim(" (aujourd'hui)");
  if (d === 1) return dim(" (hier)");
  return dim(` (il y a ${d} jours)`);
}

try {
  // --- Subscriber ---------------------------------------------------------

  const [total, verified, oldest, newest] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { verified: true } }),
    prisma.subscriber.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.subscriber.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const unverified = total - verified;

  console.log(`\n${C.bold}Abonnés${C.reset}`);
  console.log(`  Total          ${C.bold}${total}${C.reset}`);
  console.log(
    `  Vérifiés       ${verified > 0 ? C.green : C.gray}${verified}${C.reset}` +
      dim(` (destinataires réels de la newsletter)`)
  );
  console.log(
    `  Non vérifiés   ${unverified > 0 ? C.yellow : C.gray}${unverified}${C.reset}` +
      (unverified > 0 ? dim(" (double opt-in jamais confirmé)") : "")
  );
  console.log(`  Plus ancien    ${stamp(oldest?.createdAt)}${ago(oldest?.createdAt)}`);
  console.log(`  Plus récent    ${stamp(newest?.createdAt)}${ago(newest?.createdAt)}`);

  // --- DailyBrief ---------------------------------------------------------

  const briefTotal = await prisma.dailyBrief.count();
  const byType = await prisma.dailyBrief.groupBy({
    by: ["type"],
    _count: { _all: true },
    _min: { date: true },
    _max: { date: true },
    orderBy: { type: "asc" },
  });

  console.log(`\n${C.bold}Briefings${C.reset}`);
  console.log(`  Total          ${C.bold}${briefTotal}${C.reset}`);

  if (byType.length === 0) {
    console.log(dim("  Aucun briefing en base."));
  } else {
    console.log(dim("  type        nb    première       dernière"));
    for (const row of byType) {
      const type = String(row.type).padEnd(10);
      const count = String(row._count._all).padStart(4);
      // `date` est une chaîne "yyyy-MM-dd" : l'ordre lexicographique est chronologique.
      const first = (row._min.date ?? "—").padEnd(13);
      const last = row._max.date ?? "—";
      console.log(`  ${type}${count}    ${first}  ${last}`);
    }
  }

  const entries = await prisma.stockEntry.count();
  console.log(`  Lignes action  ${entries}`);

  console.log("");
} catch (err) {
  fail(
    `Échec de la requête : ${briefError(err)}`,
    "Vérifier que DATABASE_URL pointe sur une base joignable depuis cette machine."
  );
} finally {
  await prisma.$disconnect().catch(() => {});
}
