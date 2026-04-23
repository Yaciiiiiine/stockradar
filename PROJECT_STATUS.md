# StockRadar — État du projet

> 📌 Dernière mise à jour : 23 avril 2026  
> 🚦 Statut : **Beta fonctionnelle en production**

## 🌐 URLs

- **Site public** : https://stockradar-five.vercel.app
- **Repo GitHub** : https://github.com/Yaciiiiiine/stockradar
- **Dashboard Vercel** : https://vercel.com/dashboard (projet `stockradar`)
- **Dashboard Neon** (BDD) : via onglet Storage de Vercel

## ✅ Ce qui fonctionne

### Architecture technique
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma 7 avec adapter Postgres
- BDD PostgreSQL hébergée sur Neon (via Vercel Storage)
- Déploiement continu sur Vercel (push = deploy auto)
- HTTPS + CDN mondial gérés par Vercel

### Pipeline de données multi-sources
- **Finnhub** (source primaire) — couvre les 10 actions US
- **Yahoo Finance via `yahoo-finance2`** (source secondaire) — couvre les 10 actions FR
- **Cross-check automatique** sur les tickers US (seuils : alerte > 1%, critique > 3%)
- **Fallback mock** en dernier recours si tout échoue
- **Logs structurés** (mais non persistants sur Vercel à cause du FS read-only)
- Documentation complète dans `ARCHITECTURE.md`

### Crons automatiques (Vercel)
- **Matin 8h Paris** (6h UTC) — cron `morning-brief` : fetch + sauve en BDD
- **Soir 22h30 Paris** (20h30 UTC) — cron `evening-recap` : fetch + résumé séance
- ⚠️ Plan Hobby = fenêtre de tolérance 1h sur l'heure d'exécution

### Pages
- `/` — homepage avec hero + 10 US + 10 FR + recap soir
- `/archive` — historique des briefings passés
- `/about` — présentation du projet
- `/api/debug-sources` — diagnostic technique (auth requise)
- `/api/cron/morning-brief` et `/api/cron/evening-recap`
- `/api/subscribe`, `/api/confirm`, `/api/unsubscribe` (newsletter)

## 🚧 Ce qui n'est PAS encore fini

### 📧 Newsletter — inscription OK, envoi d'emails non fonctionnel
- Le formulaire d'inscription enregistre bien en BDD
- **MAIS** : `RESEND_API_KEY` n'est pas configuré dans Vercel
- Donc aucun email de confirmation n'est envoyé
- Les abonnés restent à `verified: false` indéfiniment

**Pour activer** : créer compte Resend → ajouter `RESEND_API_KEY` dans Vercel → redéployer
**Limite** : sans domaine vérifié, on ne peut envoyer qu'à l'adresse du compte Resend

### 🌐 Pas de nom de domaine perso
- Actuellement sur `stockradar-five.vercel.app` (généré par Vercel)
- Pas de `stockradar.fr` ou équivalent

### 📊 Pas de monitoring ni dashboard admin
- Pas d'interface pour visualiser les runs passés
- Logs Vercel limités à 1h d'historique sur plan Hobby
- Pas d'alerte si un cron échoue

### 🛠️ Dev local un peu cassé
- `.env.local` pointe encore vers Postgres prod (mis pour `prisma db push`)
- Pour revenir à SQLite en local, il faudrait :
  - Soit remettre `DATABASE_URL="file:./dev.db"`
  - Soit adapter `prisma.config.ts` pour bi-provider
- Pas critique (on dev peu en local maintenant)

## 🔐 Configuration actuelle

### Variables d'environnement

**Production (Vercel)** :
- `STOCK_API_KEY` = clé Finnhub
- `CRON_SECRET` = `dev-secret-123` (⚠️ à renforcer pour vraie prod)
- `DATABASE_URL` = URL Neon Postgres (injectée auto)
- `NEXT_PUBLIC_APP_URL` = URL du site
- `RESEND_API_KEY` = ❌ **manquant** (newsletter HS)

**Local (`.env.local` sur Mac)** :
- `STOCK_API_KEY` = clé Finnhub
- `DATABASE_URL` = URL Postgres prod (à nettoyer)
- `CRON_SECRET` = `dev-secret-123`

### Ressources tierces utilisées
- **Finnhub** : plan gratuit (60 req/min, US uniquement)
- **Yahoo Finance** : non officiel via `yahoo-finance2` (gratuit, risque de casse)
- **Vercel** : plan Hobby (gratuit)
- **Neon Postgres** : plan gratuit (0.5 GB, branches Production + Preview)
- **Resend** : pas encore de compte

## 🔄 Comment reprendre le projet

### Cloner et lancer en local
```bash
git clone git@github.com:Yaciiiiiine/stockradar.git
cd stockradar
npm install
cp .env.example .env.local
# Remplir .env.local avec les clés
npm run dev
```

### Déclencher manuellement un cron en prod
```bash
curl -H "Authorization: Bearer dev-secret-123" \
  https://stockradar-five.vercel.app/api/cron/morning-brief
```

### Lire les logs en BDD (via Neon SQL Editor)
```sql
SELECT * FROM "DailyBrief" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "Subscriber";
```

### Relancer une migration Prisma sur prod
```bash
# Mettre temporairement DATABASE_URL=postgres://... dans .env.local
npx prisma db push
# Remettre DATABASE_URL=file:./dev.db après
```

## 📚 Références internes

- `ARCHITECTURE.md` — pipeline multi-sources en détail
- `CLAUDE.md` — contexte projet pour les IA
- `README.md` — setup et usage basique
- `vercel.json` — config des crons

## 🎯 Perspectives (à faire "un jour")

Voir `ROADMAP.md` pour la liste des évolutions envisagées.