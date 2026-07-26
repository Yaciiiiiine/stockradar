# StockRadar — Beta

Veille boursière quotidienne. 10 actions françaises + 10 actions américaines à surveiller chaque jour. Design Apple-inspired, mode sombre.

## Fonctionnalités

- **Briefing matinal** (8h Paris) : 10 actions FR + 10 US avec raisons et catalyseurs
- **Compte-rendu du soir** (22h30 Paris) : performances, top hausses/baisses, sentiment
- **Newsletter** : double opt-in, envoi automatique via Resend
- **Archives** : historique des briefings par date
- **Mock data** : fonctionne sans clé API (données réalistes pré-chargées)

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** — design Apple-inspired, mode sombre
- **Prisma 7** + PostgreSQL (Neon en prod, conteneur Docker en local)
- **Resend** — emails transactionnels
- **Finnhub** (US) + **Yahoo Finance** (FR) — données boursières, avec fallback mock
- **Vercel Cron** — déclenchement automatique des briefings

## Setup local

```bash
# 1. Cloner le repo
git clone https://github.com/Yaciiiiiine/stockradar.git
cd stockradar

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplissez STOCK_API_KEY et CRON_SECRET dans .env

# 4. Démarrer la base de développement (Postgres local dans Docker)
npm run db:up

# 5. Appliquer les migrations dessus
npx prisma migrate deploy

# 6. Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Base de développement et séparation d'avec la production

Le dev tourne sur un **Postgres local jetable**, dans un conteneur Docker
`stockradar-pg` exposé sur le port `55432`. Même provider qu'en production,
donc aucune divergence de schéma à maintenir.

```bash
npm run db:up      # démarre (ou crée) le conteneur
npm run db:down    # l'arrête
npm run db:migrate # prisma migrate dev, derrière le garde-fou
npm run db:reset   # prisma migrate reset, derrière le garde-fou
```

> ⚠️ **L'URL Neon de production n'a rien à faire dans `.env`.** Elle vit
> uniquement dans `.env.vercel.local`. `.env` a longtemps contenu l'URL prod,
> posée le temps d'un `prisma db push` et jamais retirée : tout `npm run dev`
> lisait et écrivait la vraie base, et `prisma migrate dev` propose un reset
> dès qu'il détecte une dérive.

`scripts/guard-dev-db.mjs` fait échouer toute commande de développement dont
`DATABASE_URL` ne pointe pas sur un hôte local. Il est branché sur `predev`
— donc sur `npm run dev` — ainsi que sur `db:migrate` et `db:reset`. Il n'est
volontairement **pas** branché sur `build` : le build Vercel doit viser Neon.

Seule exception assumée : `npm run stats` est en lecture seule et accepte un
`DATABASE_URL` explicite en préfixe, pour pouvoir inspecter la prod sans
risque d'écriture.

SQLite n'est plus utilisable sur ce schéma : `StockEntry.sparkline` est un
`Float[]`, et Prisma ne sait pas représenter une liste scalaire sur SQLite.

## Variables d'environnement

| Variable | Requis | Description |
|---|---|---|
| `DATABASE_URL` | Oui | Postgres. En dev : `postgresql://stockradar:stockradar@localhost:55432/stockradar` |
| `STOCK_API_KEY` | Non | Clé Finnhub (fallback mock si vide) |
| `RESEND_API_KEY` | Non en dev, **oui en prod** | Clé Resend. Son absence fait échouer les crons en 500 en production, volontairement — voir [`docs/BLOCKERS.md`](docs/BLOCKERS.md) |
| `CRON_SECRET` | Oui | Secret pour protéger les routes cron |
| `NEXT_PUBLIC_APP_URL` | Oui | URL de l'app (`http://localhost:3000` en dev) |

## Tester les crons localement

```bash
# Briefing matinal
curl -H "Authorization: Bearer dev-secret" http://localhost:3000/api/cron/morning-brief

# Compte-rendu du soir
curl -H "Authorization: Bearer dev-secret" http://localhost:3000/api/cron/evening-recap
```

## Déploiement sur Vercel

1. Poussez le code sur GitHub
2. Importez le projet sur vercel.com
3. Ajoutez les variables d'environnement dans les settings Vercel
4. Pour la production, migrez vers **Turso** (LibSQL) ou **Neon** (PostgreSQL)
5. Les crons sont configurés dans `vercel.json` (lundi–vendredi) — voir ci-dessous

## Crons et fuseau horaire

**Vercel n'accepte que des expressions cron en UTC.** Il n'existe aucun moyen
d'y déclarer `Europe/Paris`. Une heure UTC fixe correspond donc à deux heures
de Paris différentes selon la saison :

| Cron | `vercel.json` (UTC) | Heure de Paris visée | Été (CEST, UTC+2) | Hiver (CET, UTC+1) |
|---|---|---|---|---|
| `morning-brief` | `0 6 * * 1-5` | 08:00 | **08:00** ✅ | 07:00 ⚠️ |
| `evening-recap` | `30 20 * * 1-5` | 22:30 | **22:30** ✅ | 21:30 ⚠️ |

Les valeurs actuelles sont calées sur **l'heure d'été**. Du dernier dimanche
d'octobre au dernier dimanche de mars, les deux crons partent **une heure trop
tôt**.

Pour recaler l'hiver, décaler les deux schedules d'une heure : `0 7 * * 1-5` et
`30 21 * * 1-5`. Il faut le faire manuellement deux fois par an — c'est le prix
de l'absence de fuseau côté Vercel.

Chaque route cron appelle `logCronStart()` (`lib/cron-schedule.ts`) au
démarrage. Elle log l'heure de Paris effective et émet un `console.warn` quand
le schedule UTC ne tombe plus sur l'heure visée :

```
[CRON] morning-brief — démarrage 25/07/2026 08:03 (Europe/Paris, UTC+2, heure d'été)
[CRON] morning-brief — DÉCALAGE : "0 6 * * 1-5" UTC tombe à 07:00 Paris, la cible est 08:00. Corriger vercel.json (voir README).
```

> ⚠️ Sur le plan Hobby, Vercel s'autorise en plus une fenêtre de tolérance d'une
> heure sur l'heure d'exécution réelle. Le log ci-dessus reflète l'heure de
> déclenchement effective, pas l'heure théorique.

## Qualité

```bash
npm test              # Vitest
npm run typecheck     # tsc --noEmit
npm run lint          # Biome (lint + format, lecture seule)
npm run lint:fix      # Biome, applique les corrections
npm run audit:project # audit structurel, score /100
npm run bundle-size   # poids gzip du JS client
npm run stats         # état de la base (lecture seule, remplace Prisma Studio)
```

### `npm run audit:project` — audit structurel

`scripts/audit-project.mjs` vérifie, sans rien exécuter de l'application, que
les garde-fous du projet sont en place. Il n'appelle aucune API et ne touche
pas à la base : c'est une inspection de l'arbre de fichiers et du code source,
lançable sur un clone frais.

Cinq familles de contrôles, notées sur 100 :

| Famille | Ce qui est vérifié |
|---|---|
| **Sécurité** | Routes cron et debug protégées par un contrôle d'autorisation ; contrôle ne reposant pas sur une interpolation directe de `CRON_SECRET` ; aucun secret en dur dans le code versionné ; `.env` et `*.save` exclus de Git ; aucune copie de sauvegarde dans l'arbre |
| **App Router** | Présence de `not-found.tsx`, `error.tsx`, `loading.tsx` ; client Prisma généré **hors** de `app/` |
| **SEO** | `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` et `metadataBase` |
| **Conformité** | Pages mentions légales et confidentialité ; avertissement AMF présent et lié depuis le footer **et** les emails |
| **Qualité** | Script `npm test` et fichiers de test présents ; workflow d'intégration continue ; configuration de lint / format |

Il affiche en plus une section **« À compléter par l'éditeur »**, **non comptée
dans le score** : aujourd'hui les 7 champs légaux vides de `lib/legal.ts`.
C'est délibéré — ces champs ne dépendent pas du code mais d'informations
administratives, les compter ferait baisser un score technique pour une raison
qui n'est pas technique. Ils sont détaillés dans
[`docs/BLOCKERS.md`](docs/BLOCKERS.md).

Par défaut le script sort toujours en code 0 : c'est un rapport, il ne casse
rien. Pour le brancher sur la CI, utiliser `--strict`, qui sort en code 1 dès
que le score passe sous **80** :

```bash
node scripts/audit-project.mjs --strict
```

⚠️ **`npm run lint` échoue aujourd'hui, et c'est attendu.** Biome a été ajouté
avec sa config et ses scripts sans reformater le code existant. Il reste une
vingtaine de signalements, tous antérieurs à son introduction : mise en forme,
`import type` manquants, deux SVG sans `<title>`. Les fichiers ajoutés depuis
sont propres.

Pour solder la dette d'un coup — dans un commit dédié, sans autre changement,
pour que le diff reste relisible :

```bash
npm run lint:fix
```

Tant que ce n'est pas fait, `lint` n'est volontairement pas branché sur la CI.

## Disclaimer

> StockRadar est un outil d'information. Ceci n'est pas un conseil en investissement. Faites vos propres recherches.
