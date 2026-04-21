# StockRadar — Architecture de récupération des données

> 📌 **Note pour Claude** : ce document décrit le pipeline de récupération 
> des prix boursiers. Consulte-le avant toute modification touchant à 
> `lib/sources/*`, `lib/fetcher.ts`, `lib/logger.ts` ou `lib/stocks.ts`.

## 🎯 Problème à résoudre

StockRadar doit afficher les prix de 10 actions françaises + 10 actions 
américaines chaque jour. **Aucune API gratuite ne couvre parfaitement 
les deux marchés.** On utilise donc plusieurs sources en parallèle pour 
garantir la fiabilité.

## 🏗️ Architecture multi-sources

```
┌─────────────────────────────────────────────────────────────────┐
│                    Pipeline de récupération                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Fetch principal → Finnhub (pour tous les tickers)           │
│         ↓                                                        │
│  2. Pour chaque ticker en échec → fallback Yahoo Finance        │
│         ↓                                                        │
│  3. Pour chaque ticker qui a 2 sources dispo → cross-check      │
│     delta > 1% → alerte dans les logs                           │
│         ↓                                                        │
│  4. Retour de la liste finale des prix + génération des logs    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📚 Sources de données

| Source | Couverture | Coût | Status | Priorité |
|--------|-----------|------|--------|----------|
| **Finnhub** | US uniquement (plan gratuit) | Gratuit, 60 req/min | Actif | 1 (primaire) |
| **Yahoo Finance** | US + FR + international | Gratuit, illimité (non officiel) | Actif | 2 (secondaire) |
| **Financial Modeling Prep** | US + FR + international | Gratuit, 250 req/jour | Prévu (Phase 2) | 3 (tertiaire) |

### Limitations connues

- **Finnhub plan gratuit** : refuse les actions européennes (`.PA`, `.DE`, etc.) 
  avec l'erreur `"You don't have access to this resource."` C'est pour ça 
  que Yahoo est nécessaire.
- **Yahoo Finance** : non officiel (scraping via `yahoo-finance2`). Peut 
  casser si Yahoo change son format. Acceptable en Beta.

## 🔄 Règles de fallback

1. **Finnhub en premier** : tenter tous les tickers en appel groupé
2. **Yahoo uniquement pour les échecs** : économiser les requêtes
3. **Si les deux échouent** : utiliser le mock correspondant
4. **Jamais de crash global** : un ticker cassé ne doit pas bloquer les autres

## 🔍 Règles de comparaison (cross-check)

- La comparaison ne se fait **que si au moins 2 sources ont répondu** pour 
  un même ticker.
- Comparaison sur le **prix** (pas sur la variation %).
- **Formule du delta** : `abs((prixA - prixB) / prixA) * 100`
- **Seuil d'alerte** : `ALERT_THRESHOLD_PCT = 1.0` (1%)
- **Seuil critique** : `CRITICAL_THRESHOLD_PCT = 3.0` (3%)
- **Pas d'alerte** si une seule source répond → l'info est notée dans le 
  log mais pas comme une alerte.

### Quelle source fait foi en cas de divergence ?

**Par défaut** : la source avec la priorité la plus haute (Finnhub pour 
les US, Yahoo pour les FR). Une divergence n'est qu'une alerte interne, 
pas un changement de prix affiché.

## 📝 Système de logs (3 niveaux)

### Niveau 1 — Console (`console.log` / `console.error`)
Logs temps réel pour le debug pendant le développement.
```
[FETCH] Finnhub batch request for 20 tickers...
[OK]    AAPL  → $268.01 via Finnhub
[FAIL]  MC.PA → Finnhub 403, retrying with Yahoo...
[OK]    MC.PA → €687.40 via Yahoo (fallback)
[COMP]  AAPL  → Finnhub $268.01 vs Yahoo $267.98 (delta 0.01%) OK
[ALERT] NVDA  → Finnhub $876.40 vs Yahoo $820.15 (delta 6.42%) HIGH
```

### Niveau 2 — Fichier `logs/fetch-history.json`
Historique persistant structuré. Rotation automatique : garde les **90 
derniers runs**. Format :

```json
{
  "runs": [
    {
      "timestamp": "2026-04-21T08:00:00.000Z",
      "run_id": "morning-brief-2026-04-21-08-00",
      "trigger": "cron" | "manual" | "api",
      "summary": {
        "total_tickers": 20,
        "finnhub_success": 10,
        "finnhub_failed": 10,
        "yahoo_fallback_success": 10,
        "yahoo_fallback_failed": 0,
        "mock_used": 0,
        "comparisons_done": 10,
        "comparisons_alerts": 2
      },
      "tickers": [
        {
          "symbol": "AAPL",
          "market": "US",
          "final_source": "finnhub",
          "final_price": 268.01,
          "finnhub": { "status": "ok", "price": 268.01 },
          "yahoo": { "status": "ok", "price": 267.98 },
          "comparison": { "delta_pct": 0.01, "alert": false }
        },
        {
          "symbol": "MC.PA",
          "market": "FR",
          "final_source": "yahoo",
          "final_price": 687.40,
          "finnhub": { "status": "error", "error": "You don't have access to this resource." },
          "yahoo": { "status": "ok", "price": 687.40 },
          "comparison": null,
          "comparison_skipped_reason": "only_one_source_available"
        }
      ]
    }
  ]
}
```

### Niveau 3 — Fichier `logs/alerts.log`
Événements critiques uniquement (delta > 1%, source down, taux d'échec 
élevé). Format texte pour `grep` facile.

```
2026-04-21T08:00:00Z [PRICE_DELTA]       NVDA: Finnhub $876.40 vs Yahoo $820.15 (delta 6.42%)
2026-04-21T08:00:12Z [SOURCE_DOWN]       Yahoo returned 500 for symbol GOOGL
2026-04-21T22:30:01Z [HIGH_FAILURE_RATE] 8/20 tickers failed on Finnhub
```

## 🗂️ Structure de fichiers

```
lib/
├── sources/
│   ├── types.ts            Interface commune StockSource
│   ├── finnhub.ts          Implémentation Finnhub
│   ├── yahoo.ts            Implémentation Yahoo Finance
│   └── fmp.ts              [Phase 2 — placeholder commenté]
├── fetcher.ts              Orchestrateur : appelle les sources, compare, logge
├── logger.ts               Gestion des 3 niveaux de logs
├── stocks.ts               Point d'entrée public (appelé par les pages)
└── mock-data.ts            Données mock (fallback ultime)

logs/                       À ajouter au .gitignore
├── fetch-history.json
└── alerts.log
```

## 🔌 Interface commune `StockSource`

Pour faciliter l'ajout de nouvelles sources (comme FMP en Phase 2) :

```typescript
export interface StockSource {
  readonly name: string;              // "finnhub" | "yahoo" | "fmp"
  readonly priority: number;          // 1 = primaire, 2+ = secondaire
  
  /**
   * Indique si cette source peut potentiellement fetch ce symbole.
   * Ex: Finnhub (plan free) renvoie false pour les symboles .PA
   */
  canFetch(symbol: string): boolean;
  
  /**
   * Récupère une quote. Throw une erreur en cas d'échec.
   * Le fetcher orchestrateur catch et gère le fallback.
   */
  fetchQuote(symbol: string): Promise<StockQuote>;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: number;
  source: string;                      // nom de la source qui a fourni
}
```

## 🚀 Ajout d'une nouvelle source (procédure)

Pour ajouter FMP ou n'importe quelle autre source :

1. Créer `lib/sources/<nom>.ts` qui implémente `StockSource`
2. Ajouter la variable d'env correspondante dans `.env.example`
3. Enregistrer la source dans `lib/fetcher.ts` (tableau `SOURCES`)
4. Mettre à jour le tableau "Sources de données" ci-dessus
5. **Aucune autre modification nécessaire** : le pipeline s'adapte tout seul

## 📊 Monitoring futur (Phase 3)

Quand on aura plus de recul, on ajoutera :

- Dashboard admin `/admin/logs` pour visualiser `fetch-history.json`
- Email automatique si `comparisons_alerts > 5` dans un run
- Métriques : taux de succès par source, latence moyenne, etc.

## ⚠️ Points d'attention

- **Jamais de clé API en dur** : toujours `process.env.*`
- **Toujours un fallback mock** : le site ne doit jamais planter
- **Logs non versionnés** : `logs/` doit être dans `.gitignore`
- **Pas de logging PII** : ne jamais logger d'emails utilisateurs ou infos sensibles