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
- **Prisma 7** + SQLite (local)
- **Resend** — emails transactionnels
- **Financial Modeling Prep** — données boursières (optionnel)
- **Vercel Cron** — déclenchement automatique des briefings

## Setup local

```bash
# 1. Cloner le repo
git clone https://github.com/[USER]/stockradar.git
cd stockradar

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplissez les valeurs dans .env

# 4. Initialiser la base de données
npx prisma migrate dev

# 5. Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

| Variable | Requis | Description |
|---|---|---|
| `DATABASE_URL` | Oui | Chemin SQLite : `file:./dev.db` |
| `STOCK_API_KEY` | Non | Clé Financial Modeling Prep (fallback mock si vide) |
| `RESEND_API_KEY` | Non | Clé Resend pour les emails (désactivé si vide) |
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
