#!/usr/bin/env node
/**
 * Refuse de laisser une commande de développement s'exécuter contre une base
 * distante.
 *
 * Historique : `.env` a longtemps contenu l'URL Neon de production, posée le
 * temps d'un `prisma db push` et jamais retirée. Tout `npm run dev` lisait et
 * écrivait donc la vraie base, et un `prisma migrate dev` — qui propose un
 * reset dès qu'il détecte une dérive — aurait détruit la production.
 *
 * Ce garde-fou est branché sur `predev` et sur les commandes Prisma de dev
 * (voir package.json). Il n'est PAS branché sur `build` : le build Vercel doit
 * évidemment pouvoir viser Neon.
 */

import "dotenv/config";

/** Hôtes considérés comme une base locale jetable. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

const url = process.env.DATABASE_URL;

if (!url) {
  fail(
    "DATABASE_URL est absente.",
    "Copier .env.example vers .env et démarrer la base avec `npm run db:up`."
  );
}

let host;
try {
  host = new URL(url).hostname;
} catch {
  fail(
    `DATABASE_URL n'est pas une URL valide : ${redact(url)}`,
    "Attendu : postgresql://user:pass@localhost:55432/stockradar"
  );
}

if (!LOCAL_HOSTS.has(host)) {
  fail(
    `DATABASE_URL pointe sur un hôte distant (${host}).`,
    [
      "Une commande de développement ne doit jamais viser la production.",
      "L'URL Neon appartient à .env.vercel.local, pas à .env.",
      "Pour du dev local : `npm run db:up` puis DATABASE_URL sur localhost:55432.",
    ].join("\n  ")
  );
}

/** Masque les identifiants avant d'écrire quoi que ce soit dans un terminal. */
function redact(value) {
  return value.replace(/\/\/[^@]*@/, "//***:***@");
}

function fail(message, hint) {
  console.error(`\n\x1b[31m✖ garde-fou base de dev\x1b[0m — ${message}`);
  console.error(`  ${hint}\n`);
  process.exit(1);
}
