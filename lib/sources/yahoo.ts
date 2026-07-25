import YahooFinance from "yahoo-finance2";
import { StockSource, StockQuote } from "./types";
import { resample, SPARKLINE_POINTS } from "../sparkline";

// ---------------------------------------------------------------------------
// Throttle : Yahoo est non-officiel, on reste conservateur à 200ms
// ---------------------------------------------------------------------------

let lastRequestTime = 0;
const THROTTLE_MS = 200;

async function throttle(): Promise<void> {
  const wait = THROTTLE_MS - (Date.now() - lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();
}

// ---------------------------------------------------------------------------
// Cache in-memory (TTL 5 minutes, partagé avec les autres sources)
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Instance Yahoo Finance (singleton, supprime le message de survey au démarrage)
// ---------------------------------------------------------------------------

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ---------------------------------------------------------------------------
// Implémentation StockSource
// ---------------------------------------------------------------------------

class YahooSource implements StockSource {
  readonly name = "yahoo";
  readonly priority = 2;

  // Yahoo couvre tous les marchés (US + FR + monde)
  canFetch(_symbol: string): boolean {
    return true;
  }

  /**
   * Série intraday du jour, intervalle 5 minutes.
   *
   * Ne lève jamais : une sparkline est décorative, son absence ne doit pas
   * faire échouer un ticker dont le prix est correctement récupéré. Renvoie
   * un tableau vide en cas d'échec, à charge de l'appelant de retomber sur
   * une série générée.
   */
  async fetchSparkline(symbol: string): Promise<number[]> {
    const cacheKey = `yf:spark:${symbol}`;
    const cached = cacheGet<number[]>(cacheKey);
    if (cached) return cached;

    try {
      await throttle();

      // 1 jour d'historique glissant : couvre la séance en cours, et la
      // précédente quand le marché n'a pas encore ouvert.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await yf.chart(symbol, { period1: since, interval: "5m" });

      const closes = (result?.quotes ?? [])
        .map((q) => q.close)
        .filter((c): c is number => typeof c === "number" && Number.isFinite(c));

      const series = resample(closes, SPARKLINE_POINTS);
      cacheSet(cacheKey, series);
      return series;
    } catch {
      return [];
    }
  }

  async fetchQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `yf:quote:${symbol}`;
    const cached = cacheGet<StockQuote>(cacheKey);
    if (cached) return cached;

    await throttle();

    // suppresseErrors: false → on veut les vraies erreurs pour le fallback
    const raw = await yf.quote(symbol);

    if (raw.regularMarketPrice == null) {
      throw new Error(`Yahoo returned null price for ${symbol}`);
    }

    // regularMarketTime est un Date ou un timestamp number selon la version
    const ts =
      raw.regularMarketTime instanceof Date
        ? raw.regularMarketTime.getTime()
        : typeof raw.regularMarketTime === "number"
          ? raw.regularMarketTime * 1000
          : Date.now();

    const quote: StockQuote = {
      symbol,
      price: raw.regularMarketPrice,
      change: raw.regularMarketChange ?? 0,
      changePercent: raw.regularMarketChangePercent ?? 0,
      volume: raw.regularMarketVolume ?? undefined,
      timestamp: ts,
      source: "yahoo",
    };

    cacheSet(cacheKey, quote);
    return quote;
  }
}

// Export de l'instance singleton
export const yahooSource = new YahooSource();
