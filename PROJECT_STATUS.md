# StockRadar — État du projet

> 📌 Dernière mise à jour : **26 juillet 2026**
> 🚦 Statut : **Beta en production, phases 0 et 1 livrées, mise en pause**

Ce fichier décrit l'état réel à la date ci-dessus. Les blocages qui demandent
une action humaine sont détaillés dans **[`docs/BLOCKERS.md`](docs/BLOCKERS.md)** —
c'est le fichier à ouvrir en premier en reprenant le projet.

## 🌐 URLs

- **Site public** : https://stockradar-five.vercel.app
- **Repo GitHub** : https://github.com/Yaciiiiiine/stockradar
- **Dashboard Vercel** : projet `stockradar` (org `yacdahmani11-4572s-projects`)
- **Dashboard Neon** (BDD prod) : via l'onglet Storage de Vercel

---

## ✅ Livré et déployé

### Phase 0 — Assainissement

Terminée et en production. Elle a corrigé des pannes qui étaient toutes
silencieuses, ce qui était le vrai problème :

- **Les échecs d'envoi d'email remontent.** `lib/email.ts` retournait sans
  rien faire quand `RESEND_API_KEY` manquait, et ignorait le
  `{ data: null, error }` que renvoie Resend en cas de refus. Les crons
  concluaient `success: true` sans qu'un seul email parte. Deux classes
  d'erreur explicites désormais (`MissingApiKeyError`, `EmailSendError`) et un
  `SendSummary` chiffré en retour de cron.
- **Garde de configuration au démarrage des crons** (`lib/env-guard.ts`) :
  en production, une variable requise absente est une panne 500, pas un no-op.
  Hors production, elle est seulement loggée.
- **Authentification des routes cron réparée** (`lib/auth.ts`) : la comparaison
  littérale laissait entrer quiconque envoyait `Bearer undefined` quand
  `CRON_SECRET` n'était pas défini. Comparaison à temps constant maintenant.
- **Décalage horaire des crons rendu visible** (`lib/cron-schedule.ts`) :
  Vercel n'accepte que de l'UTC, donc les schedules calés sur l'heure d'été
  partent une heure trop tôt en hiver. Un `console.warn` le signale à chaque
  exécution concernée. Voir le tableau du README.
- **Pages légales** `/mentions-legales` et `/confidentialite`, avertissement
  AMF dans le footer et dans les emails, lien de désinscription.
- **Outillage qualité** : Vitest (6 fichiers de test), Biome, workflow CI,
  `scripts/audit-project.mjs`, `scripts/stats.mjs`, `scripts/bundle-size.mjs`.

### Phase 1 — Animations 2D

Terminée et en production :

- socle d'animation respectant `prefers-reduced-motion` (`lib/motion.ts`) ;
- compteurs animés sur les prix et les variations ;
- **sparkline intraday par action** — série récupérée à la source (Yahoo),
  repli sur une série générée quand la source ne fournit rien ;
- défilement fluide global (Lenis) ;
- transitions de vue entre l'accueil et les pages d'archive.

### Migration Neon appliquée

La migration `20260725220000_add_sparkline` (colonne `StockEntry.sparkline`,
`Float[]`) **est appliquée sur la base de production Neon**, et l'historique
Prisma y a été réaligné (commit `619a8ae`). Les briefs antérieurs à la colonne
n'ont pas de série stockée : les pages reconstruisent une sparkline pour eux.

### Déploiement

Vercel est **vert**. Dernier déploiement Production `● Ready`, et le site
répond `200`. Les routes cron répondent bien `401` sans en-tête d'autorisation.

---

## 🗄️ Données en production

- **1 abonné, non vérifié.** Il ne recevra jamais son email de confirmation
  tant que le blocage n°1 de `docs/BLOCKERS.md` n'est pas levé, et il restera
  en base indéfiniment faute de tâche de purge (voir blocage n°3).
- `DailyBrief` et `StockEntry` alimentés par les crons depuis avril.

> ℹ️ Le compte d'abonnés ci-dessus est celui constaté par toi. Il n'a pas pu
> être revérifié depuis le VPS le 26/07 : Neon n'est pas joignable en direct
> depuis cette machine (`psql` expire). Le site déployé, lui, y accède
> normalement. Pour recompter : `npm run stats` avec `DATABASE_URL` pointant
> sur l'URL Neon, depuis une machine ayant l'accès réseau.

---

## 🧪 Environnements — dev et prod séparés

C'est le changement de cette session, et il est important pour la reprise.

**Avant** : `.env` contenait l'URL Neon de production, posée le temps d'un
`prisma db push` et jamais retirée. Tout `npm run dev` lisait et écrivait la
vraie base, et un `prisma migrate dev` — qui propose un reset dès qu'il
détecte une dérive — aurait pu détruire la production.

**Maintenant** :

| | Base | Où vit l'URL |
|---|---|---|
| **Dev** | Postgres local, conteneur Docker `stockradar-pg` sur le port `55432` | `.env` |
| **Prod** | Neon (via Vercel Storage) | `.env.vercel.local` **uniquement** |

`scripts/guard-dev-db.mjs` refuse toute `DATABASE_URL` dont l'hôte n'est pas
local. Il est branché sur `predev` (donc sur `npm run dev`), `db:migrate` et
`db:reset`. Il n'est **pas** branché sur `build` : le build Vercel doit
évidemment viser Neon.

SQLite n'était pas une option pour revenir en arrière : la colonne
`StockEntry.sparkline` est un `Float[]`, et Prisma ne sait pas représenter une
liste scalaire sur SQLite. Le fichier `dev.db` à la racine est un reliquat de
la période SQLite (avril), non versionné et inutilisé — il peut être supprimé.

```bash
npm run db:up       # démarre le Postgres local
npm run dev         # garde-fou, puis Next
npm run db:down     # arrête le conteneur
```

---

## 🚧 Ce qui reste bloqué

Le détail — symptôme, cause, action attendue — est dans
**[`docs/BLOCKERS.md`](docs/BLOCKERS.md)**. En résumé :

| # | Blocage | Effet |
|---|---|---|
| 1 | `RESEND_API_KEY` absente de Vercel | **Les crons répondront 500 dès lundi.** C'est le comportement voulu : un échec visible remplace un succès mensonger. |
| 2 | Aucun domaine vérifié chez Resend | L'expéditeur doit rester `onboarding@resend.dev`, qui n'envoie qu'à l'adresse du compte Resend. Tout autre expéditeur est refusé en 403. |
| 3 | 7 champs légaux vides dans `lib/legal.ts` | Encart rouge « à compléter » sur les pages légales. Purge des abonnés non confirmés annoncée mais non implémentée. |
| 4 | `npm run lint` échoue (~22 signalements) | Dette antérieure à Biome. Lint volontairement pas branché sur la CI. |
| 5 | `CRON_SECRET` = `dev-secret-123` | Secret faible, et publié en clair dans une version antérieure de ce fichier : à considérer comme compromis. |

### Autres manques, sans blocage humain

- **Pas de nom de domaine perso** — le site est sur `stockradar-five.vercel.app`.
- **Pas de monitoring ni de dashboard admin** — pas d'alerte si un cron échoue,
  et les logs Vercel sont limités à 1 h d'historique sur le plan Hobby.
- **Décalage horaire des crons en hiver** — à recaler manuellement au passage à
  l'heure d'hiver (`0 7 * * 1-5` et `30 21 * * 1-5`), cf. README.

---

## 🔐 Configuration

### Production (Vercel)

| Variable | État |
|---|---|
| `DATABASE_URL` | ✅ injectée automatiquement par l'intégration Neon |
| `STOCK_API_KEY` | ✅ clé Finnhub |
| `NEXT_PUBLIC_APP_URL` | ✅ |
| `CRON_SECRET` | ⚠️ valeur de dev, à remplacer (blocage n°5) |
| `RESEND_API_KEY` | ❌ **absente** (blocage n°1) |

### Local (`.env`)

Voir `.env.example`. `DATABASE_URL` pointe le Postgres local, `STOCK_API_KEY`
est renseignée, `RESEND_API_KEY` est vide — c'est toléré hors production.

### Ressources tierces

- **Finnhub** — plan gratuit (60 req/min, tickers US uniquement)
- **Yahoo Finance** — non officiel via `yahoo-finance2` (gratuit, peut casser)
- **Vercel** — plan Hobby
- **Neon Postgres** — plan gratuit (0,5 Go)
- **Resend** — ❌ pas encore de compte

---

## 🔄 Reprendre le projet

```bash
git clone https://github.com/Yaciiiiiine/stockradar.git
cd stockradar
npm install
cp .env.example .env       # puis renseigner STOCK_API_KEY et CRON_SECRET
npm run db:up              # Postgres local dans Docker
npx prisma migrate deploy  # applique les migrations sur la base locale
npm run dev
```

Vérifier la santé du projet :

```bash
npm run build
npm test
npm run audit:project      # score structurel /100
npm run bundle-size        # poids gzip du JS client
```

---

## 📚 Références internes

| Fichier | Contenu |
|---|---|
| [`docs/BLOCKERS.md`](docs/BLOCKERS.md) | **À lire en premier** — les 5 blocages et l'action attendue de toi |
| [`docs/ROADMAP-3D.md`](docs/ROADMAP-3D.md) | Phases 2 (Market Globe) et 3 (treemap 3D + `/stock/[ticker]`) et leurs contraintes |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Pipeline multi-sources en détail |
| [`HISTORY_AND_ROADMAP.md`](HISTORY_AND_ROADMAP.md) | Journal de bord d'avril et perspectives produit |
| [`README.md`](README.md) | Setup, crons et fuseau horaire, outils de qualité |
| `vercel.json` | Configuration des crons |
