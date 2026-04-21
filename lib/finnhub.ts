import { StockData } from "./mock-data";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const BASE_URL = "https://finnhub.io/api/v1";

// Tickers avec noms en dur pour économiser les appels /stock/profile2
export const FR_TICKERS: { symbol: string; name: string }[] = [
  { symbol: "MC.PA",  name: "LVMH Moët Hennessy" },
  { symbol: "TTE.PA", name: "TotalEnergies" },
  { symbol: "SAN.PA", name: "Sanofi" },
  { symbol: "SU.PA",  name: "Schneider Electric" },
  { symbol: "AIR.PA", name: "Airbus" },
  { symbol: "BNP.PA", name: "BNP Paribas" },
  { symbol: "RMS.PA", name: "Hermès International" },
  { symbol: "OR.PA",  name: "L'Oréal" },
  { symbol: "DSY.PA", name: "Dassault Systèmes" },
  { symbol: "HO.PA",  name: "Thales" },
];

export const US_TICKERS: { symbol: string; name: string }[] = [
  { symbol: "AAPL",  name: "Apple Inc." },
  { symbol: "MSFT",  name: "Microsoft Corporation" },
  { symbol: "NVDA",  name: "NVIDIA Corporation" },
  { symbol: "TSLA",  name: "Tesla, Inc." },
  { symbol: "META",  name: "Meta Platforms, Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN",  name: "Amazon.com, Inc." },
  { symbol: "AMD",   name: "Advanced Micro Devices" },
  { symbol: "PLTR",  name: "Palantir Technologies" },
  { symbol: "NFLX",  name: "Netflix, Inc." },
];

// ---------------------------------------------------------------------------
// Interfaces Finnhub
// ---------------------------------------------------------------------------

interface FinnhubQuote {
  c: number;   // prix actuel
  d: number;   // variation absolue
  dp: number;  // variation en %
  h: number;   // plus haut du jour
  l: number;   // plus bas du jour
  o: number;   // ouverture
  pc: number;  // clôture précédente
  t: number;   // timestamp
}

interface FinnhubNewsItem {
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

interface FinnhubEarningsItem {
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
// Throttle : file d'attente séquentielle pour rester sous 60 req/min
// On attend 110ms entre chaque requête → ~54 req/min max
// ---------------------------------------------------------------------------

let lastRequestTime = 0;
const THROTTLE_MS = 110;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = THROTTLE_MS - (now - lastRequestTime);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
  return fetch(url, { cache: "no-store" });
}

// ---------------------------------------------------------------------------
// Appels API Finnhub
// ---------------------------------------------------------------------------

async function fetchQuote(symbol: string, token: string): Promise<FinnhubQuote> {
  const cacheKey = `quote:${symbol}`;
  const cached = cacheGet<FinnhubQuote>(cacheKey);
  if (cached) return cached;

  const res = await throttledFetch(`${BASE_URL}/quote?symbol=${symbol}&token=${token}`);
  if (!res.ok) throw new Error(`Finnhub quote error ${res.status} for ${symbol}`);

  const data: FinnhubQuote = await res.json();
  // Prix à 0 = symbole inconnu de Finnhub
  if (data.c === 0) throw new Error(`Finnhub returned empty quote for ${symbol}`);

  cacheSet(cacheKey, data);
  return data;
}

async function fetchCompanyNews(
  symbol: string,
  token: string,
  date: string
): Promise<FinnhubNewsItem[]> {
  const cacheKey = `news:${symbol}:${date}`;
  const cached = cacheGet<FinnhubNewsItem[]>(cacheKey);
  if (cached) return cached;

  const res = await throttledFetch(
    `${BASE_URL}/company-news?symbol=${symbol}&from=${date}&to=${date}&token=${token}`
  );
  if (!res.ok) throw new Error(`Finnhub news error ${res.status} for ${symbol}`);

  const data: FinnhubNewsItem[] = await res.json();
  cacheSet(cacheKey, data);
  return data;
}

async function fetchEarningsCalendar(
  token: string,
  date: string
): Promise<FinnhubEarningsItem[]> {
  const cacheKey = `earnings:${date}`;
  const cached = cacheGet<FinnhubEarningsItem[]>(cacheKey);
  if (cached) return cached;

  const res = await throttledFetch(
    `${BASE_URL}/calendar/earnings?from=${date}&to=${date}&token=${token}`
  );
  if (!res.ok) throw new Error(`Finnhub earnings error ${res.status}`);

  const body: FinnhubEarningsCalendar = await res.json();
  const data = body.earningsCalendar ?? [];
  cacheSet(cacheKey, data);
  return data;
}

// ---------------------------------------------------------------------------
// Construction de la raison en français
// ---------------------------------------------------------------------------

function buildReason(
  symbol: string,
  news: FinnhubNewsItem[],
  earnings: FinnhubEarningsItem[],
  changePercent: number
): string {
  const cleanSymbol = symbol.replace(".PA", "");
  const sign = changePercent >= 0 ? "+" : "";

  // Priorité 1 : résultats trimestriels du jour
  const hasEarnings = earnings.some(
    (e) => e.symbol === symbol || e.symbol === cleanSymbol
  );
  if (hasEarnings) {
    const e = earnings.find((e) => e.symbol === symbol || e.symbol === cleanSymbol)!;
    const timing = e.hour === "bmo" ? "avant ouverture" : e.hour === "amc" ? "après clôture" : "en séance";
    const epsInfo =
      e.epsActual !== null && e.epsEstimate !== null
        ? ` BPA réel : ${e.epsActual} vs ${e.epsEstimate} estimé.`
        : "";
    return `Publication des résultats trimestriels ${timing} (T${e.quarter} ${e.year}).${epsInfo} Le titre réagit de ${sign}${changePercent.toFixed(2)}% en séance.`;
  }

  // Priorité 2 : news du jour
  if (news.length > 0) {
    // On prend le titre le plus récent
    const latest = news.sort((a, b) => b.datetime - a.datetime)[0];
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

// ---------------------------------------------------------------------------
// Point d'entrée principal : récupère un titre complet
// ---------------------------------------------------------------------------

export async function fetchStockData(
  symbol: string,
  name: string,
  market: "FR" | "US",
  token: string,
  date: string,
  earningsCache: FinnhubEarningsItem[]
): Promise<StockData> {
  const quote = await fetchQuote(symbol, token);
  const news = await fetchCompanyNews(symbol, token, date);

  const ticker = symbol.replace(".PA", "");
  const reason = buildReason(symbol, news, earningsCache, quote.dp);

  return {
    ticker,
    name,
    market,
    price: quote.c,
    change: quote.dp,
    reason,
    preMarket: undefined,
    volume: undefined,
  };
}

// ---------------------------------------------------------------------------
// Récupère toutes les actions (FR + US) avec throttling et fallback par ticker
// ---------------------------------------------------------------------------

export async function fetchAllStocks(token: string): Promise<{
  fr: StockData[];
  us: StockData[];
}> {
  const today = format(new Date(), "yyyy-MM-dd");

  // 1 seul appel pour le calendrier des résultats du jour
  let earningsCache: FinnhubEarningsItem[] = [];
  try {
    earningsCache = await fetchEarningsCalendar(token, today);
  } catch (err) {
    console.error("[Finnhub] earnings calendar fetch failed:", err);
  }

  // Fonction utilitaire : fetch d'un ticker avec fallback silencieux
  async function fetchOne(
    ticker: { symbol: string; name: string },
    market: "FR" | "US",
    fallback: StockData
  ): Promise<StockData> {
    try {
      return await fetchStockData(ticker.symbol, ticker.name, market, token, today, earningsCache);
    } catch (err) {
      console.error(`[Finnhub] failed for ${ticker.symbol}, using mock fallback:`, err);
      return fallback;
    }
  }

  // Imports des mocks pour le fallback par ticker
  const { MOCK_FR_STOCKS, MOCK_US_STOCKS } = await import("./mock-data");

  // Traitement séquentiel (le throttle est géré dans throttledFetch)
  const fr: StockData[] = [];
  for (let i = 0; i < FR_TICKERS.length; i++) {
    const stock = await fetchOne(FR_TICKERS[i], "FR", MOCK_FR_STOCKS[i]);
    fr.push(stock);
  }

  const us: StockData[] = [];
  for (let i = 0; i < US_TICKERS.length; i++) {
    const stock = await fetchOne(US_TICKERS[i], "US", MOCK_US_STOCKS[i]);
    us.push(stock);
  }

  return { fr, us };
}

// ---------------------------------------------------------------------------
// Génère le résumé du soir à partir des vraies données
// ---------------------------------------------------------------------------

export function buildEveningSummary(fr: StockData[], us: StockData[]): string {
  const allFR = [...fr].sort((a, b) => b.change - a.change);
  const top3FR = allFR.slice(0, 3).map((s) => `${s.ticker} (${s.change > 0 ? "+" : ""}${s.change.toFixed(2)}%)`);
  const bot3FR = allFR.slice(-3).reverse().map((s) => `${s.ticker} (${s.change.toFixed(2)}%)`);

  const avgFR = fr.reduce((sum, s) => sum + s.change, 0) / fr.length;
  const avgUS = us.reduce((sum, s) => sum + s.change, 0) / us.length;

  const sentimentFR = avgFR > 0.5 ? "positif" : avgFR < -0.5 ? "négatif" : "neutre";
  const sentimentUS = avgUS > 0.5 ? "positif" : avgUS < -0.5 ? "négatif" : "neutre";

  return (
    `Séance de clôture : le sentiment est ${sentimentFR} sur les valeurs françaises (variation moyenne ${avgFR > 0 ? "+" : ""}${avgFR.toFixed(2)}%) ` +
    `et ${sentimentUS} côté américain (${avgUS > 0 ? "+" : ""}${avgUS.toFixed(2)}%). ` +
    `Meilleures performances FR : ${top3FR.join(", ")}. ` +
    `Plus fortes baisses FR : ${bot3FR.join(", ")}.`
  );
}
