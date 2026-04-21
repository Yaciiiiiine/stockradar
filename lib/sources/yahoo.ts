import YahooFinance from "yahoo-finance2";
import { StockSource, StockQuote } from "./types";

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
