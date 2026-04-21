import { StockSource, StockQuote } from "./types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const BASE_URL = "https://finnhub.io/api/v1";

// Suffixes de marchés européens refusés par le plan gratuit Finnhub
const EU_SUFFIXES = [".PA", ".DE", ".L", ".AS", ".MC", ".SW", ".MI", ".BR"];

// ---------------------------------------------------------------------------
// Interfaces brutes Finnhub (non exposées à l'extérieur)
// ---------------------------------------------------------------------------

interface FinnhubQuoteRaw {
  c: number;   // prix actuel
  d: number;   // variation absolue
  dp: number;  // variation en %
  h: number;   // plus haut du jour
  l: number;   // plus bas du jour
  o: number;   // ouverture
  pc: number;  // clôture précédente
  t: number;   // timestamp
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubEarningsItem {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface FinnhubEarningsCalendar {
  earningsCalendar: FinnhubEarningsItem[];
}

// ---------------------------------------------------------------------------
// Cache in-memory (TTL 5 minutes)
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
// Throttle : 110ms entre requêtes → ~54 req/min, sous la limite de 60
// ---------------------------------------------------------------------------

let lastRequestTime = 0;
const THROTTLE_MS = 110;

async function throttledFetch(url: string): Promise<Response> {
  const wait = THROTTLE_MS - (Date.now() - lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url, { cache: "no-store" });
}

// ---------------------------------------------------------------------------
// Implémentation StockSource
// ---------------------------------------------------------------------------

class FinnhubSource implements StockSource {
  readonly name = "finnhub";
  readonly priority = 1;

  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  canFetch(symbol: string): boolean {
    // Le plan gratuit Finnhub refuse tous les marchés européens
    return !EU_SUFFIXES.some((suffix) => symbol.endsWith(suffix));
  }

  async fetchQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `fh:quote:${symbol}`;
    const cached = cacheGet<StockQuote>(cacheKey);
    if (cached) return cached;

    const t0 = Date.now();
    const res = await throttledFetch(
      `${BASE_URL}/quote?symbol=${symbol}&token=${this.token}`
    );

    if (!res.ok) {
      throw new Error(`Finnhub HTTP ${res.status} for ${symbol}`);
    }

    const raw: FinnhubQuoteRaw = await res.json();

    // Prix à 0 = symbole inconnu ou non couvert
    if (raw.c === 0) {
      throw new Error(`Finnhub returned empty quote (c=0) for ${symbol}`);
    }

    const quote: StockQuote = {
      symbol,
      price: raw.c,
      change: raw.d,
      changePercent: raw.dp,
      timestamp: raw.t > 0 ? raw.t * 1000 : Date.now(),
      source: "finnhub",
    };

    cacheSet(cacheKey, quote);
    return quote;
  }
}

// ---------------------------------------------------------------------------
// Fonctions auxiliaires pour la construction des raisons (Option A)
// Utilisées par lib/stocks.ts, pas par l'orchestrateur fetcher.ts
// ---------------------------------------------------------------------------

export async function fetchFinnhubNews(
  symbol: string,
  token: string,
  date: string
): Promise<FinnhubNewsItem[]> {
  const cacheKey = `fh:news:${symbol}:${date}`;
  const cached = cacheGet<FinnhubNewsItem[]>(cacheKey);
  if (cached) return cached;

  const res = await throttledFetch(
    `${BASE_URL}/company-news?symbol=${symbol}&from=${date}&to=${date}&token=${token}`
  );
  if (!res.ok) throw new Error(`Finnhub news HTTP ${res.status} for ${symbol}`);

  const data: FinnhubNewsItem[] = await res.json();
  cacheSet(cacheKey, data);
  return data;
}

export async function fetchFinnhubEarnings(
  token: string,
  date: string
): Promise<FinnhubEarningsItem[]> {
  const cacheKey = `fh:earnings:${date}`;
  const cached = cacheGet<FinnhubEarningsItem[]>(cacheKey);
  if (cached) return cached;

  const res = await throttledFetch(
    `${BASE_URL}/calendar/earnings?from=${date}&to=${date}&token=${token}`
  );
  if (!res.ok) throw new Error(`Finnhub earnings HTTP ${res.status}`);

  const body: FinnhubEarningsCalendar = await res.json();
  const data = body.earningsCalendar ?? [];
  cacheSet(cacheKey, data);
  return data;
}

/**
 * Construit le texte de raison en français à partir des news et résultats.
 * Priorité : résultats trimestriels > news du jour > mouvement fort > mouvement ordinaire.
 */
export function buildReason(
  symbol: string,
  news: FinnhubNewsItem[],
  earnings: FinnhubEarningsItem[],
  changePercent: number
): string {
  const cleanSymbol = symbol.replace(/\.[A-Z]+$/, "");
  const sign = changePercent >= 0 ? "+" : "";

  // Priorité 1 : résultats trimestriels du jour
  const earning = earnings.find(
    (e) => e.symbol === symbol || e.symbol === cleanSymbol
  );
  if (earning) {
    const timing =
      earning.hour === "bmo"
        ? "avant ouverture"
        : earning.hour === "amc"
        ? "après clôture"
        : "en séance";
    const epsInfo =
      earning.epsActual !== null && earning.epsEstimate !== null
        ? ` BPA réel : ${earning.epsActual} vs ${earning.epsEstimate} estimé.`
        : "";
    return `Publication des résultats trimestriels ${timing} (T${earning.quarter} ${earning.year}).${epsInfo} Le titre réagit de ${sign}${changePercent.toFixed(2)}% en séance.`;
  }

  // Priorité 2 : news du jour (la plus récente)
  if (news.length > 0) {
    const latest = [...news].sort((a, b) => b.datetime - a.datetime)[0];
    const direction = changePercent >= 0 ? "hausse" : "repli";
    return `${latest.headline} Le titre est en ${direction} de ${sign}${changePercent.toFixed(2)}% suite à cette actualité.`;
  }

  // Priorité 3 : fort mouvement sans catalyseur identifié
  if (Math.abs(changePercent) > 3) {
    const intensite = Math.abs(changePercent) > 6 ? "très fort" : "fort";
    return `${intensite.charAt(0).toUpperCase() + intensite.slice(1)} mouvement de ${sign}${changePercent.toFixed(2)}% sans catalyseur publié identifié — probable repositionnement institutionnel ou flux sectoriels. Volumes à surveiller.`;
  }

  // Priorité 4 : mouvement ordinaire
  const sentiment =
    changePercent > 1.5
      ? "progression modérée"
      : changePercent < -1.5
      ? "légère pression vendeuse"
      : "séance calme";
  return `${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} (${sign}${changePercent.toFixed(2)}%). Aucune actualité majeure publiée ce jour — mouvement en ligne avec la tendance sectorielle.`;
}

// Export de l'instance (singleton par token)
const instances = new Map<string, FinnhubSource>();

export function getFinnhubSource(token: string): FinnhubSource {
  if (!instances.has(token)) instances.set(token, new FinnhubSource(token));
  return instances.get(token)!;
}
