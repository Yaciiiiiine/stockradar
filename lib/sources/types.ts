/**
 * Interface commune pour toutes les sources de données boursières.
 * Voir ARCHITECTURE.md section "Interface commune StockSource".
 *
 * Pour ajouter une nouvelle source :
 *   1. Créer lib/sources/<nom>.ts implémentant StockSource
 *   2. Enregistrer dans lib/fetcher.ts tableau SOURCES
 *   3. Aucune autre modification nécessaire
 */
export interface StockSource {
  readonly name: string;
  readonly priority: number;

  /**
   * Retourne false si la source ne peut pas traiter ce symbole.
   * Ex : Finnhub free refuse les symboles européens (.PA, .DE, etc.)
   */
  canFetch(symbol: string): boolean;

  /**
   * Récupère une quote. Throw en cas d'échec — le fetcher gère le fallback.
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
  source: string;
}

/**
 * Résultat consolidé par ticker après passage dans l'orchestrateur.
 * Utilisé pour construire fetch-history.json.
 */
export interface TickerResult {
  symbol: string;
  market: "FR" | "US";
  final_source: "finnhub" | "yahoo" | "mock";
  final_price: number;
  finnhub: SourceAttempt;
  yahoo: SourceAttempt;
  comparison: ComparisonResult | null;
  comparison_skipped_reason?: string;
}

export interface SourceAttempt {
  status: "ok" | "error" | "skipped";
  price?: number;
  error?: string;
  latency_ms?: number;
}

export interface ComparisonResult {
  delta_pct: number;
  alert: boolean;
  critical: boolean;
}

export interface RunSummary {
  total_tickers: number;
  finnhub_success: number;
  finnhub_failed: number;
  finnhub_skipped: number;
  yahoo_fallback_success: number;
  yahoo_fallback_failed: number;
  mock_used: number;
  comparisons_done: number;
  comparisons_alerts: number;
}

export interface RunLog {
  timestamp: string;
  run_id: string;
  trigger: "cron" | "manual" | "api";
  summary: RunSummary;
  tickers: TickerResult[];
}
