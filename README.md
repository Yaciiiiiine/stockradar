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
5. Les crons sont configurés dans `vercel.json` (lundi–vendredi, 8h et 22h30 Paris)

## Disclaimer

> StockRadar est un outil d'information. Ceci n'est pas un conseil en investissement. Faites vos propres recherches.
