# StockRadar — Journal de bord et perspectives

## 📖 L'histoire du projet (avril 2026)

### Point de départ
Idée : un site minimaliste style Apple qui affiche **les 10 actions FR et US à surveiller chaque jour** avec la raison, un compte-rendu le soir, et une newsletter.

Contexte personnel : exploration de monétisation via projets tech, side-business en parallèle du temps limité, background DV semiconductor + n8n.

### Ce qu'on a construit (chronologie)

**Jour 1 — Conception + premier prompt**
- Définition du concept "StockRadar - Beta"
- Stack choisi : Next.js + TypeScript + Tailwind + Prisma/SQLite + Resend
- Premier prompt Claude Code très détaillé pour scaffolder le projet
- Architecture mock-first : site fonctionnel sans aucune clé API

**Jour 2 — Setup infra perso**
- Configuration VPS Hetzner (Ubuntu 24.04)
- Sécurisation SSH (clés ed25519, désactivation root login)
- Installation Docker, tmux, Claude Code
- Clonage du projet sur VPS + Mac
- Apprentissage workflow Git double-machine

**Jour 3 — Première tentative de vraies données (échec partiel)**
- Création compte Finnhub + récupération clé API
- Découverte du piège des guillemets dans `.env` (2 fois !)
- Confirmation que Finnhub gratuit ne couvre pas les actions FR (erreur 403 sur `.PA`)
- Décision d'architecture multi-sources

**Jour 4 — Refactor architecture**
- Écriture d'ARCHITECTURE.md (spec complète)
- Intégration Yahoo Finance via `yahoo-finance2` comme source secondaire
- Pipeline : Finnhub primaire (US) + Yahoo fallback (FR) + cross-check
- Logs structurés avec rotation (même si non persistants en serverless)
- Compréhension du design BDD-centric (les pages lisent la BDD, les crons la remplissent)

**Jour 5 — Déploiement en production**
- Installation VS Code + workflow pro
- Compte Vercel créé via GitHub
- Premier build → erreurs Prisma (code généré manquant)
- Migration SQLite → Postgres (Neon via Vercel Storage)
- Apprentissage Prisma 7 (nouvelle config `prisma.config.ts`)
- Installation `@prisma/adapter-pg` pour la compat
- Résolution d'erreurs de type en cascade
- Premier cron exécuté → premières vraies données en prod

**Jour 6 — Validation**
- Site fonctionnel sur `https://stockradar-five.vercel.app`
- Vrais prix US et FR affichés
- Crons matin + soir configurés (fenêtre 1h sur plan Hobby)
- Point d'arrêt volontaire pour rationaliser avant la suite

### Les galères marquantes (pour mémoire)

1. **Guillemets dans `.env`** — tombé 2 fois dans le piège. La règle : pas de guillemets par défaut, sauf espaces/caractères spéciaux.

2. **Finnhub ne couvre pas les actions européennes en gratuit** — découverte tardive. Solution : architecture multi-sources avec Yahoo en fallback.

3. **Prisma 7 vs Prisma 6** — Claude Code a installé la v7 mais avec une config entre les deux versions. Apprentissage des nouvelles conventions (`prisma.config.ts`, adapters explicites).

4. **SQLite ne marche pas sur Vercel** — le système de fichiers est read-only en serverless. Migration forcée vers Postgres.

5. **Les crons Vercel en plan Hobby ont une fenêtre de tolérance d'1h** — pas grave mais bon à savoir.

6. **Le cache Next.js peut masquer des changements** — `rm -rf .next` résout beaucoup de bugs de dev mystérieux.

### Ce qu'on a appris techniquement

- **Git workflow multi-machine** : push/pull propre entre Mac et VPS
- **Variables d'environnement** : `.env.local` vs Vercel dashboard, jamais de secrets dans Git
- **Debugging Next.js** : logs serveur, routes de debug, curl avec headers
- **Architecture multi-sources** : interface commune, fallback gracieux, cross-check
- **Prisma + Postgres** : schema, migrations, adapters, config
- **Vercel déploiement** : crons, env vars, cold starts, limitations gratuit
- **Serverless vs self-hosted** : système de fichiers éphémère, stateless

### Ce qu'on a appris niveau produit

- **Ne pas sur-ingénieur** : un scraping toutes les 5 min n'apporterait rien au produit
- **Mock-first** : avoir un site fonctionnel sans API permet de montrer sans friction
- **Séparation des responsabilités** : sources de prix ≠ logique métier (ex: "la raison")
- **BDD-centric vs live fetch** : lire la BDD au render, alimenter via crons

## 🎯 Perspectives — pour un jour

### Priorité 1 — Finir la newsletter (2-3h)
- Créer compte Resend (gratuit 3000 emails/mois)
- Ajouter `RESEND_API_KEY` dans Vercel
- Tester le flow double opt-in (inscription → email → confirm)
- Sans domaine vérifié : limité à l'email du compte Resend

### Priorité 2 — Nom de domaine (~10€/an)
- Acheter `stockradar.fr` (ou `.io`, `.app`)
- Connecter à Vercel (DNS records à configurer)
- Bonus : domaine permet de vérifier Resend pour envoyer à n'importe qui

### Priorité 3 — Premiers utilisateurs (beta test)
- Partager l'URL à 5-10 amis / contacts intéressés par la bourse
- Récolter feedback sur :
  - La pertinence des 10 actions sélectionnées
  - La qualité des "raisons" affichées
  - Le design / UX mobile
  - La valeur perçue de la newsletter

### Priorité 4 — Améliorations techniques
- **Phase 2 architecture** : ajouter FMP comme 3ème source
- **Dashboard admin** `/admin/logs` pour visualiser les runs
- **Notifications d'alertes** (email si delta > seuil entre sources)
- **Tests automatisés** (Vitest ou Playwright)
- **CRON_SECRET** : renforcer avec une vraie valeur aléatoire longue

### Priorité 5 — Améliorations produit
- **Traduction des news Finnhub en français** (via GPT-4 ou Claude)
- **Filtres par secteur** (tech, énergie, banques...)
- **Historique des performances** ("Nos 10 actions d'hier ont fait +2.3% en moyenne")
- **Export PDF du briefing** pour les utilisateurs pro
- **Version anglaise** du site

### Priorité 6 — Monétisation (long terme)
- Premium : alertes en temps réel, plus de marchés, analyse IA approfondie
- Partenariat avec brokers (affiliation)
- API publique payante pour devs
- Sponsoring de newsletters

### Idées qu'on a écartées (et pourquoi)

- ❌ **Scraping toutes les 5 min** — ne sert pas le produit (surveillance quotidienne), risque de ban Yahoo, coût en compute
- ❌ **Commit des fichiers `node_modules`** — jamais
- ❌ **Stocker les logs dans Git** — non versionnés dans `/logs`
- ❌ **Mettre la clé Finnhub dans le code** — toujours via `process.env`

## 🧭 Quand reprendre ce projet ?

Idéalement :
- Quand tu as bloqué 2-3h d'affilée pour avancer sereinement
- Quand tu as une intention claire (newsletter ? domaine ? design ?)
- Pas dans l'urgence

## 🎁 Ce que ce projet t'a apporté (au-delà du code)

- Maîtrise du workflow dev moderne complet (local → Git → prod)
- Compréhension en profondeur de Next.js, Prisma, Vercel
- Sensibilité aux bonnes pratiques (sécurité, architecture, séparation des responsabilités)
- Premier vrai produit tech en prod **public et fonctionnel**
- Une base solide pour le prochain projet (tu réutiliseras 80% de ce workflow)

## 💬 Pense-bête pour le futur

- **Le `.env.local` n'est jamais dans Git** — vérifier `.gitignore` avant chaque nouveau projet
- **Tester en prod après chaque deploy** — ne pas assumer que "ça marche en local = ça marche en prod"
- **Garder `ARCHITECTURE.md` à jour** — même pour soi-même, c'est précieux
- **Ne pas hésiter à pauser** — un projet qui marche à 80% vaut mieux qu'un projet à 100% jamais fini
- **Les IAs sont des copilotes, pas des pilotes** — toujours valider le plan avant de coder