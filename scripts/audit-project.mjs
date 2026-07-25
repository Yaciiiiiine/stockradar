#!/usr/bin/env node
/**
 * Audit structurel de StockRadar.
 *
 *   node scripts/audit-project.mjs [chemin]
 *
 * Vérifie des propriétés observables du dépôt — présence de fichiers,
 * protection des routes sensibles, conformité légale, outillage de test.
 * N'exécute ni build ni tests : c'est une photographie, pas une validation.
 *
 * Sort toujours en code 0 : l'audit informe, il ne casse pas la CI.
 * Utiliser --strict pour sortir en 1 si le score passe sous le seuil.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(process.argv.find((a) => !a.startsWith("-") && a !== process.argv[0] && a !== process.argv[1]) ?? process.cwd());
const STRICT = process.argv.includes("--strict");
const THRESHOLD = 80;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const has = (p) => existsSync(join(ROOT, p));

const read = (p) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return "";
  }
};

const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "generated",
  "__snapshots__",
]);

/** Liste récursivement les fichiers sous `dir` dont l'extension est retenue. */
function walk(dir, exts, acc = []) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return acc;
  for (const entry of readdirSync(abs)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const rel = join(dir, entry);
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, exts, acc);
    else if (exts.some((e) => entry.endsWith(e))) acc.push(rel);
  }
  return acc;
}

/** Fichiers de routes API qui doivent être protégés (crons + diagnostic). */
function sensitiveRoutes() {
  return walk("app/api", ["route.ts"]).filter(
    (f) => f.includes("/cron/") || f.includes("debug")
  );
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const checks = [
  // --- Sécurité ---------------------------------------------------------
  {
    cat: "Sécurité",
    weight: 8,
    label: "Routes cron et debug protégées par un contrôle d'autorisation",
    run: () => {
      const routes = sensitiveRoutes();
      if (routes.length === 0) return { ok: false, detail: "aucune route trouvée" };
      const unprotected = routes.filter((f) => {
        const src = read(f);
        return !/isAuthorized|CRON_SECRET/.test(src);
      });
      return {
        ok: unprotected.length === 0,
        detail:
          unprotected.length === 0
            ? `${routes.length} routes vérifiées`
            : `non protégées : ${unprotected.join(", ")}`,
      };
    },
  },
  {
    cat: "Sécurité",
    weight: 7,
    label: "Le contrôle ne repose pas sur l'interpolation directe de CRON_SECRET",
    run: () => {
      // `auth !== \`Bearer ${process.env.CRON_SECRET}\`` laisse passer
      // "Bearer undefined" quand la variable n'est pas définie.
      const guilty = sensitiveRoutes().filter((f) =>
        /Bearer \$\{process\.env\.CRON_SECRET\}/.test(read(f))
      );
      return {
        ok: guilty.length === 0,
        detail:
          guilty.length === 0
            ? "comparaison centralisée"
            : `motif vulnérable dans : ${guilty.join(", ")}`,
      };
    },
  },
  {
    cat: "Sécurité",
    weight: 5,
    label: "Aucun secret en dur dans le code versionné",
    run: () => {
      const files = [...walk("app", [".ts", ".tsx"]), ...walk("lib", [".ts"])];
      const pattern =
        /(API_KEY|SECRET|PASSWORD|TOKEN)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/;
      const hits = files.filter((f) => pattern.test(read(f)));
      return {
        ok: hits.length === 0,
        detail: hits.length === 0 ? "rien détecté" : `suspect : ${hits.join(", ")}`,
      };
    },
  },
  {
    cat: "Sécurité",
    weight: 5,
    label: "Fichiers .env et *.save exclus de Git",
    run: () => {
      const gi = read(".gitignore");
      const missing = [];
      if (!/^\.env$/m.test(gi)) missing.push(".env");
      if (!/^\*\.save$/m.test(gi)) missing.push("*.save");
      return {
        ok: missing.length === 0,
        detail: missing.length === 0 ? "couverts" : `absents : ${missing.join(", ")}`,
      };
    },
  },
  {
    cat: "Sécurité",
    weight: 5,
    label: "Aucune copie de sauvegarde (*.save) dans l'arbre",
    run: () => {
      const found = [...walk(".", [".save"])];
      return {
        ok: found.length === 0,
        detail: found.length === 0 ? "aucune" : found.join(", "),
      };
    },
  },

  // --- Structure App Router ---------------------------------------------
  {
    cat: "App Router",
    weight: 5,
    label: "app/not-found.tsx",
    run: () => ({ ok: has("app/not-found.tsx") }),
  },
  {
    cat: "App Router",
    weight: 5,
    label: "app/error.tsx",
    run: () => ({ ok: has("app/error.tsx") }),
  },
  {
    cat: "App Router",
    weight: 5,
    label: "app/loading.tsx",
    run: () => ({ ok: has("app/loading.tsx") }),
  },
  {
    cat: "App Router",
    weight: 10,
    label: "Client Prisma généré hors de l'arbre app/",
    run: () => {
      const schema = read("prisma/schema.prisma");
      const output = /output\s*=\s*"([^"]+)"/.exec(schema)?.[1] ?? "";
      const insideApp = output.includes("/app/") || output.startsWith("../app");
      return {
        ok: !insideApp && !has("app/generated"),
        detail: output ? `output = ${output}` : "output non déclaré",
      };
    },
  },

  // --- SEO ---------------------------------------------------------------
  {
    cat: "SEO",
    weight: 5,
    label: "app/sitemap.ts",
    run: () => ({ ok: has("app/sitemap.ts") }),
  },
  {
    cat: "SEO",
    weight: 5,
    label: "app/robots.ts",
    run: () => ({ ok: has("app/robots.ts") }),
  },
  {
    cat: "SEO",
    weight: 5,
    label: "app/opengraph-image.tsx + metadataBase",
    run: () => {
      const ok =
        has("app/opengraph-image.tsx") && /metadataBase/.test(read("app/layout.tsx"));
      return {
        ok,
        detail: has("app/opengraph-image.tsx")
          ? "image présente"
          : "image absente",
      };
    },
  },

  // --- Conformité --------------------------------------------------------
  {
    cat: "Conformité",
    weight: 5,
    label: "Page mentions légales",
    run: () => ({ ok: has("app/mentions-legales/page.tsx") }),
  },
  {
    cat: "Conformité",
    weight: 5,
    label: "Page politique de confidentialité",
    run: () => ({ ok: has("app/confidentialite/page.tsx") }),
  },
  {
    cat: "Conformité",
    weight: 5,
    label: "Avertissement AMF présent et lié depuis le footer et les emails",
    run: () => {
      const amf = /pas un prestataire de services d'investissement/;
      const inLegal = amf.test(read("lib/legal.ts"));
      const inFooter = /AMF_DISCLAIMER/.test(read("components/SiteFooter.tsx"));
      const inEmail = /AMF_DISCLAIMER/.test(read("lib/email.ts"));
      const missing = [];
      if (!inLegal) missing.push("texte");
      if (!inFooter) missing.push("footer");
      if (!inEmail) missing.push("emails");
      return {
        ok: missing.length === 0,
        detail: missing.length === 0 ? "site + emails" : `manque : ${missing.join(", ")}`,
      };
    },
  },

  // --- Qualité -----------------------------------------------------------
  {
    cat: "Qualité",
    weight: 5,
    label: "Script npm test et fichiers de test",
    run: () => {
      const pkg = JSON.parse(read("package.json") || "{}");
      const hasScript = Boolean(pkg.scripts?.test);
      const files = walk("tests", [".test.ts"]);
      return {
        ok: hasScript && files.length > 0,
        detail: `${files.length} fichier(s) de test, script ${hasScript ? "présent" : "absent"}`,
      };
    },
  },
  {
    cat: "Qualité",
    weight: 5,
    label: "Workflow d'intégration continue",
    run: () => ({ ok: has(".github/workflows/ci.yml") }),
  },
  {
    cat: "Qualité",
    weight: 5,
    label: "Configuration de lint / format",
    run: () => ({
      ok: has("biome.json") || has("biome.jsonc") || has("eslint.config.mjs"),
    }),
  },
];

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

const C = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

console.log(`\n${C.bold}Audit StockRadar${C.reset} ${C.gray}${ROOT}${C.reset}\n`);

let earned = 0;
let total = 0;
let currentCat = null;
const failures = [];

for (const check of checks) {
  const result = check.run();
  const ok = Boolean(result.ok);
  total += check.weight;
  if (ok) earned += check.weight;
  else failures.push(check);

  if (check.cat !== currentCat) {
    currentCat = check.cat;
    console.log(`${C.bold}${currentCat}${C.reset}`);
  }

  const mark = ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  const detail = result.detail ? ` ${C.gray}— ${result.detail}${C.reset}` : "";
  console.log(`  ${mark} ${check.label}${detail}`);
}

// --- Informatif : champs légaux restants ------------------------------------

const legalSrc = read("lib/legal.ts");
if (legalSrc) {
  const pending = [...legalSrc.matchAll(/(\w+):\s*null as string \| null/g)].map(
    (m) => m[1]
  );
  if (pending.length > 0) {
    console.log(
      `\n${C.yellow}À compléter par l'éditeur${C.reset} ${C.gray}(non compté dans le score)${C.reset}`
    );
    console.log(`  ${C.yellow}⚠${C.reset}  ${pending.length} champs légaux vides : ${pending.join(", ")}`);
  }
}

// --- Score ------------------------------------------------------------------

const score = Math.round((earned / total) * 100);
const color = score >= 90 ? C.green : score >= 70 ? C.yellow : C.red;

console.log(`\n${C.bold}Score${C.reset}  ${color}${C.bold}${score}/100${C.reset} ${C.gray}(${earned}/${total} points)${C.reset}`);

if (failures.length > 0) {
  console.log(`\n${C.bold}Restant${C.reset}`);
  for (const f of failures) {
    console.log(`  ${C.red}·${C.reset} [${f.cat}] ${f.label} ${C.gray}(${f.weight} pts)${C.reset}`);
  }
}
console.log("");

if (STRICT && score < THRESHOLD) {
  console.error(`Score sous le seuil de ${THRESHOLD}.`);
  process.exit(1);
}
process.exit(0);
