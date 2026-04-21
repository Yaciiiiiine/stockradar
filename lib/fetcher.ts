import { format } from "date-fns";
import { StockData, MOCK_FR_STOCKS, MOCK_US_STOCKS } from "./mock-data";
import { StockQuote, TickerResult, SourceAttempt, RunLog, RunSummary } from "./sources/types";
import { getFinnhubSource } from "./sources/finnhub";
import { yahooSource } from "./sources/yahoo";
import { TickerDef } from "./sources/tickers";
import { logConsole, appendRun, writeAlert } from "./logger";

// ---------------------------------------------------------------------------
// Seuils de comparaison (voir ARCHITECTURE.md)
// ---------------------------------------------------------------------------

const ALERT_THRESHOLD_PCT    = 1.0;
const CRITICAL_THRESHOLD_PCT = 3.0;
const HIGH_FAILURE_THRESHOLD = 0.4; // alerte si >40% des tickers échouent sur une source

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockStock(def: TickerDef): StockData {
  const mocks = def.market === "FR" ? MOCK_FR_STOCKS : MOCK_US_STOCKS;
  const found = mocks.find((m) => m.ticker === def.symbol.replace(/\.[A-Z]+$/, ""));
  return found ?? {
    ticker: def.symbol.replace(/\.[A-Z]+$/, ""),
    name: def.name,
    market: def.market,
    price: 0,
    change: 0,
    reason: "Données indisponibles.",
  };
}

/** Durée en ms depuis t0 */
function elapsed(t0: number): number {
  return Date.now() - t0;
}

/** Calcule le delta % entre deux prix */
function deltaPct(priceA: number, priceB: number): number {
  if (priceA === 0) return 0;
  return Math.abs((priceA - priceB) / priceA) * 100;
}

// ---------------------------------------------------------------------------
// Pipeline principal
// ---------------------------------------------------------------------------

export interface FetchResult {
  stocks: StockData[];
  runLog: RunLog;
}

/**
 * Orchestre Finnhub → Yahoo → mock pour une liste de tickers.
 * Retourne les StockData avec prix réels (sans reason, construite dans stocks.ts).
 * N'est jamais rejeté — fallback mock en dernier recours.
 */
export async function fetchAllStocks(
  tickers: TickerDef[],
  trigger: RunLog["trigger"] = "api"
): Promise<FetchResult> {
  const token = process.env.STOCK_API_KEY;
  const finnhub = token ? getFinnhubSource(token) : null;
  const today   = format(new Date(), "yyyy-MM-dd");

  const runId = `${trigger}-${today}-${format(new Date(), "HH-mm")}`;

  logConsole({ type: "fetch_start", message: `Starting run ${runId} for ${tickers.length} tickers` });

  // Résultats par ticker (indexés par symbol pour accès rapide)
  const tickerResults = new Map<string, TickerResult>();

  // Quotes récupérées (pour cross-check ensuite)
  const finnhubQuotes = new Map<string, StockQuote>();
  const yahooQuotes   = new Map<string, StockQuote>();

  // ---------------------------------------------------------------------------
  // Étape 1 : Finnhub (pour tous les tickers où canFetch() = true)
  // ---------------------------------------------------------------------------

  let finnhubSuccesses = 0;
  let finnhubFailures  = 0;
  let finnhubSkipped   = 0;

  for (const def of tickers) {
    const attempt: SourceAttempt = { status: "skipped" };

    if (!finnhub || !finnhub.canFetch(def.symbol)) {
      // Pas de clé ou symbole EU → skip silencieux
      attempt.status = "skipped";
      finnhubSkipped++;
      logConsole({ type: "skip", symbol: def.symbol, source: "finnhub",
        reason: finnhub ? "EU suffix not covered by free plan" : "no API key" });
    } else {
      const t0 = Date.now();
      try {
        const quote = await finnhub.fetchQuote(def.symbol);
        const ms = elapsed(t0);
        attempt.status  = "ok";
        attempt.price   = quote.price;
        attempt.latency_ms = ms;
        finnhubSuccesses++;
        finnhubQuotes.set(def.symbol, quote);
        logConsole({ type: "ok", symbol: def.symbol, source: "finnhub", price: quote.price, latency_ms: ms });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attempt.status = "error";
        attempt.error  = msg;
        finnhubFailures++;
        logConsole({ type: "fail", symbol: def.symbol, source: "finnhub", error: msg });
      }
    }

    tickerResults.set(def.symbol, {
      symbol: def.symbol,
      market: def.market,
      final_source: "mock",   // sera mis à jour plus bas
      final_price:  0,
      finnhub: attempt,
      yahoo:   { status: "skipped" },
      comparison: null,
    });
  }

  // Alerte si taux d'échec Finnhub élevé (sur les tickers qu'elle devait couvrir)
  const finnhubAttempted = finnhubSuccesses + finnhubFailures;
  if (finnhubAttempted > 0 && finnhubFailures / finnhubAttempted > HIGH_FAILURE_THRESHOLD) {
    const msg = `${finnhubFailures}/${finnhubAttempted} tickers failed on Finnhub`;
    writeAlert("HIGH_FAILURE_RATE", msg);
    logConsole({ type: "alert", alertType: "HIGH_FAILURE_RATE", message: msg });
  }

  // ---------------------------------------------------------------------------
  // Étape 2 : Yahoo pour les tickers Finnhub échoués ou skipped
  // ---------------------------------------------------------------------------

  let yahooFallbackSuccess = 0;
  let yahooFallbackFailed  = 0;

  // Tickers à passer à Yahoo : ceux sans quote Finnhub valide
  const needsYahoo = tickers.filter((def) => !finnhubQuotes.has(def.symbol));

  for (const def of needsYahoo) {
    const t0 = Date.now();
    try {
      const quote = await yahooSource.fetchQuote(def.symbol);
      const ms = elapsed(t0);
      const result = tickerResults.get(def.symbol)!;
      result.yahoo = { status: "ok", price: quote.price, latency_ms: ms };
      yahooFallbackSuccess++;
      yahooQuotes.set(def.symbol, quote);
      logConsole({ type: "ok", symbol: def.symbol, source: "yahoo", price: quote.price, latency_ms: ms });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const result = tickerResults.get(def.symbol)!;
      result.yahoo = { status: "error", error: msg };
      yahooFallbackFailed++;
      logConsole({ type: "fail", symbol: def.symbol, source: "yahoo", error: msg });
    }
  }

  // ---------------------------------------------------------------------------
  // Étape 3 : Cross-check sur les US (Phase 1 — là où Finnhub + Yahoo répondent)
  // Appel Yahoo supplémentaire uniquement pour les US avec Finnhub OK
  // ---------------------------------------------------------------------------

  const usFinnhubOk = tickers.filter(
    (def) => def.market === "US" && finnhubQuotes.has(def.symbol)
  );

  let comparisons      = 0;
  let comparisonAlerts = 0;

  for (const def of usFinnhubOk) {
    // Yahoo a peut-être déjà été appelé pour ce ticker (si Finnhub avait échoué)
    // mais ici Finnhub a réussi → Yahoo n'a PAS encore été appelé → on le fait maintenant
    let yahooQuote = yahooQuotes.get(def.symbol);

    if (!yahooQuote) {
      try {
        yahooQuote = await yahooSource.fetchQuote(def.symbol);
        yahooQuotes.set(def.symbol, yahooQuote);
        // Met à jour l'attempt Yahoo dans le résultat (cross-check, pas fallback)
        const result = tickerResults.get(def.symbol)!;
        result.yahoo = { status: "ok", price: yahooQuote.price };
      } catch {
        // Pas de quote Yahoo → pas de comparaison possible, on continue
        continue;
      }
    }

    const fhQuote  = finnhubQuotes.get(def.symbol)!;
    const delta    = deltaPct(fhQuote.price, yahooQuote.price);
    const isAlert  = delta > ALERT_THRESHOLD_PCT;
    const isCrit   = delta > CRITICAL_THRESHOLD_PCT;

    comparisons++;
    if (isAlert) comparisonAlerts++;

    const result = tickerResults.get(def.symbol)!;
    result.comparison = { delta_pct: delta, alert: isAlert, critical: isCrit };

    logConsole({ type: "comp", symbol: def.symbol, delta_pct: delta, alert: isAlert });

    if (isAlert) {
      const msg = `${def.symbol}: Finnhub $${fhQuote.price.toFixed(2)} vs Yahoo $${yahooQuote.price.toFixed(2)} (delta ${delta.toFixed(2)}%)`;
      writeAlert(isCrit ? "PRICE_DELTA_CRITICAL" : "PRICE_DELTA", msg);
      logConsole({ type: "alert", alertType: "PRICE_DELTA", message: msg });
    }
  }

  // ---------------------------------------------------------------------------
  // Étape 4 : Consolider source finale + construire StockData[]
  // Priorité : Finnhub > Yahoo > mock
  // ---------------------------------------------------------------------------

  let mockUsed = 0;
  const stocks: StockData[] = [];

  for (const def of tickers) {
    const result  = tickerResults.get(def.symbol)!;
    const fhQuote = finnhubQuotes.get(def.symbol);
    const yfQuote = yahooQuotes.get(def.symbol);

    let finalSource: TickerResult["final_source"];
    let finalPrice: number;
    let finalChange: number;

    if (fhQuote) {
      finalSource = "finnhub";
      finalPrice  = fhQuote.price;
      finalChange = fhQuote.changePercent;
    } else if (yfQuote) {
      finalSource = "yahoo";
      finalPrice  = yfQuote.price;
      finalChange = yfQuote.changePercent;
    } else {
      finalSource = "mock";
      const mock  = makeMockStock(def);
      finalPrice  = mock.price;
      finalChange = mock.change;
      mockUsed++;
    }

    result.final_source = finalSource;
    result.final_price  = finalPrice;

    // La raison sera construite dans lib/stocks.ts (Option A)
    stocks.push({
      ticker: def.symbol.replace(/\.[A-Z]+$/, ""),
      name:   def.name,
      market: def.market,
      price:  finalPrice,
      change: finalChange,
      reason: "",   // placeholder — rempli par stocks.ts
    });
  }

  // ---------------------------------------------------------------------------
  // Étape 5 : Construire et persister le RunLog
  // ---------------------------------------------------------------------------

  const summary: RunSummary = {
    total_tickers:          tickers.length,
    finnhub_success:        finnhubSuccesses,
    finnhub_failed:         finnhubFailures,
    finnhub_skipped:        finnhubSkipped,
    yahoo_fallback_success: yahooFallbackSuccess,
    yahoo_fallback_failed:  yahooFallbackFailed,
    mock_used:              mockUsed,
    comparisons_done:       comparisons,
    comparisons_alerts:     comparisonAlerts,
  };

  const runLog: RunLog = {
    timestamp: new Date().toISOString(),
    run_id:    runId,
    trigger,
    summary,
    tickers: Array.from(tickerResults.values()),
  };

  // Non-bloquant — une erreur d'I/O ne bloque pas la réponse HTTP
  appendRun(runLog);

  logConsole({
    type: "fetch_start",
    message: `Run ${runId} done — finnhub:${finnhubSuccesses} yahoo:${yahooFallbackSuccess} mock:${mockUsed} alerts:${comparisonAlerts}`,
  });

  return { stocks, runLog };
}
