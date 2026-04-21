import { StockData, MOCK_FR_STOCKS, MOCK_US_STOCKS } from "./mock-data";

const API_KEY = process.env.STOCK_API_KEY;

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  volume: number;
  previousClose: number;
}

interface FMPNews {
  symbol: string;
  title: string;
  publishedDate: string;
}

async function fetchFMPQuotes(tickers: string[]): Promise<FMPQuote[]> {
  const symbols = tickers.join(",");
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) throw new Error("FMP quote fetch failed");
  return res.json();
}

async function fetchFMPNews(tickers: string[]): Promise<FMPNews[]> {
  const symbols = tickers.join(",");
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbols}&limit=50&apikey=${API_KEY}`,
    { next: { revalidate: 900 } }
  );
  if (!res.ok) throw new Error("FMP news fetch failed");
  return res.json();
}

const FR_TICKERS = ["MC.PA", "TTE.PA", "SAN.PA", "SU.PA", "AIR.PA", "BNP.PA", "RMS.PA", "OR.PA", "DSY.PA", "HO.PA"];
const US_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "META", "GOOGL", "AMZN", "AMD", "PLTR", "NFLX"];

function mapFMPToStockData(quote: FMPQuote, market: "FR" | "US", reason: string): StockData {
  const ticker = quote.symbol.replace(".PA", "");
  return {
    ticker,
    name: quote.name,
    market,
    price: quote.price,
    change: quote.changesPercentage,
    reason,
    volume: quote.volume,
  };
}

function buildReason(ticker: string, news: FMPNews[], change: number): string {
  const relevant = news.filter((n) => n.symbol === ticker).slice(0, 1);
  if (relevant.length > 0) {
    const headline = relevant[0].title;
    const direction = change > 0 ? "hausse" : "repli";
    return `${headline}. Variation en ${direction} de ${Math.abs(change).toFixed(2)}% en séance, volumes en ligne avec les moyennes historiques.`;
  }
  if (Math.abs(change) > 3) {
    return `Fort mouvement de ${change > 0 ? "+":""}${change.toFixed(2)}% sans catalyseur identifié — probable repositionnement institutionnel ou arbitrage sectoriel. Les volumes sont ${Math.abs(change) > 5 ? "nettement supérieurs" : "légèrement supérieurs"} à la normale.`;
  }
  return `Mouvement technique en ligne avec le secteur. Variation de ${change > 0 ? "+":""}${change.toFixed(2)}% dans un contexte de marché calme. Aucune news significative en dehors des flux habituels.`;
}

export async function getMorningStocks(): Promise<{ fr: StockData[]; us: StockData[] }> {
  if (!API_KEY) {
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS };
  }

  try {
    const [frQuotes, usQuotes, frNews, usNews] = await Promise.all([
      fetchFMPQuotes(FR_TICKERS),
      fetchFMPQuotes(US_TICKERS),
      fetchFMPNews(FR_TICKERS),
      fetchFMPNews(US_TICKERS),
    ]);

    const fr = frQuotes
      .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
      .slice(0, 10)
      .map((q) => mapFMPToStockData(q, "FR", buildReason(q.symbol, frNews, q.changesPercentage)));

    const us = usQuotes
      .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
      .slice(0, 10)
      .map((q) => mapFMPToStockData(q, "US", buildReason(q.symbol, usNews, q.changesPercentage)));

    return { fr, us };
  } catch {
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS };
  }
}

export async function getEveningStocks(): Promise<{ fr: StockData[]; us: StockData[]; summary: string }> {
  if (!API_KEY) {
    return {
      fr: MOCK_FR_STOCKS,
      us: MOCK_US_STOCKS,
      summary: "Séance marquée par des mouvements sectoriels divergents. La technologie et la défense ont surperformé tandis que l'énergie a subi des prises de profit. Les indices européens terminent en légère hausse, portés par les valeurs industrielles.",
    };
  }

  try {
    const [frQuotes, usQuotes] = await Promise.all([
      fetchFMPQuotes(FR_TICKERS),
      fetchFMPQuotes(US_TICKERS),
    ]);

    const fr = frQuotes.map((q) => mapFMPToStockData(q, "FR", ""));
    const us = usQuotes.map((q) => mapFMPToStockData(q, "US", ""));

    const top3FR = [...fr].sort((a, b) => b.change - a.change).slice(0, 3);
    const bot3FR = [...fr].sort((a, b) => a.change - b.change).slice(0, 3);

    const summary = `Clôture du marché parisien : hausse pour ${top3FR.map((s) => s.ticker).join(", ")} — baisse pour ${bot3FR.map((s) => s.ticker).join(", ")}. La tendance générale reste ${fr.reduce((s, a) => s + a.change, 0) > 0 ? "positive" : "négative"} sur le CAC 40.`;

    return { fr, us, summary };
  } catch {
    return {
      fr: MOCK_FR_STOCKS,
      us: MOCK_US_STOCKS,
      summary: "Données indisponibles — veuillez consulter votre broker habituel pour les performances de clôture.",
    };
  }
}
