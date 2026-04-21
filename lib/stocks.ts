import { format } from "date-fns";
import { StockData, MOCK_FR_STOCKS, MOCK_US_STOCKS } from "./mock-data";
import { fetchAllStocks } from "./fetcher";
import { FR_TICKERS, US_TICKERS } from "./sources/tickers";
import {
  getFinnhubSource,
  fetchFinnhubNews,
  fetchFinnhubEarnings,
  buildReason,
} from "./sources/finnhub";

// ---------------------------------------------------------------------------
// Enrichissement des raisons (Option A)
// StockSource gère les prix purs ; les raisons/catalyseurs sont construits ici.
// ---------------------------------------------------------------------------

async function enrichWithReasons(stocks: StockData[]): Promise<StockData[]> {
  const token = process.env.STOCK_API_KEY;

  // Sans clé Finnhub, on génère une raison technique générique par variation
  if (!token) {
    return stocks.map((s) => ({
      ...s,
      reason: s.reason || genericReason(s.change),
    }));
  }

  const today = format(new Date(), "yyyy-MM-dd");

  // Earnings du jour : 1 seul appel pour tous les tickers
  let earnings: Awaited<ReturnType<typeof fetchFinnhubEarnings>> = [];
  try {
    earnings = await fetchFinnhubEarnings(token, today);
  } catch {
    // Non-bloquant : si earnings fail, on continue sans
  }

  // Enrichissement par ticker (séquentiel, cache en place → ~0 latence si déjà fetch)
  const enriched = await Promise.all(
    stocks.map(async (s) => {
      // Reconstitue le symbol Finnhub (FR ont le suffixe .PA, etc.)
      const def = [...FR_TICKERS, ...US_TICKERS].find(
        (t) => t.symbol.replace(/\.[A-Z]+$/, "") === s.ticker
      );
      const symbol = def?.symbol ?? s.ticker;

      // Finnhub ne couvre pas les marchés EU → raison générique pour FR
      const finnhub = getFinnhubSource(token);
      if (!finnhub.canFetch(symbol)) {
        return { ...s, reason: genericReason(s.change) };
      }

      try {
        const news   = await fetchFinnhubNews(symbol, token, today);
        const reason = buildReason(symbol, news, earnings, s.change);
        return { ...s, reason };
      } catch {
        return { ...s, reason: genericReason(s.change) };
      }
    })
  );

  return enriched;
}

/** Raison générique basée sur la variation quand aucune news n'est disponible */
function genericReason(changePercent: number): string {
  const sign = changePercent >= 0 ? "+" : "";
  if (Math.abs(changePercent) > 3) {
    return `Fort mouvement de ${sign}${changePercent.toFixed(2)}% — probable flux institutionnel ou réaction sectorielle. Aucune news identifiée via les sources disponibles.`;
  }
  const sentiment =
    changePercent > 1.5
      ? "Légère progression"
      : changePercent < -1.5
      ? "Légère pression vendeuse"
      : "Séance sans tendance marquée";
  return `${sentiment} (${sign}${changePercent.toFixed(2)}%). Mouvement en ligne avec le marché, aucun catalyseur spécifique identifié.`;
}

// ---------------------------------------------------------------------------
// Résumé du soir à partir des données réelles
// ---------------------------------------------------------------------------

export function buildEveningSummary(fr: StockData[], us: StockData[]): string {
  const sorted = [...fr].sort((a, b) => b.change - a.change);
  const top3 = sorted.slice(0, 3).map((s) => `${s.ticker} (${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}%)`);
  const bot3 = sorted.slice(-3).reverse().map((s) => `${s.ticker} (${s.change.toFixed(2)}%)`);

  const avgFR = fr.reduce((sum, s) => sum + s.change, 0) / (fr.length || 1);
  const avgUS = us.reduce((sum, s) => sum + s.change, 0) / (us.length || 1);

  const sentFR = avgFR > 0.5 ? "positif" : avgFR < -0.5 ? "négatif" : "neutre";
  const sentUS = avgUS > 0.5 ? "positif" : avgUS < -0.5 ? "négatif" : "neutre";

  return (
    `Séance de clôture : sentiment ${sentFR} sur les valeurs françaises ` +
    `(moyenne ${avgFR >= 0 ? "+" : ""}${avgFR.toFixed(2)}%) et ${sentUS} côté américain ` +
    `(${avgUS >= 0 ? "+" : ""}${avgUS.toFixed(2)}%). ` +
    `Top FR : ${top3.join(", ")}. Retardataires : ${bot3.join(", ")}.`
  );
}

// ---------------------------------------------------------------------------
// Points d'entrée publics (appelés par les pages et les routes cron)
// ---------------------------------------------------------------------------

export async function getMorningStocks(): Promise<{ fr: StockData[]; us: StockData[] }> {
  try {
    const { stocks } = await fetchAllStocks([...FR_TICKERS, ...US_TICKERS], "cron");
    const enriched   = await enrichWithReasons(stocks);
    return {
      fr: enriched.filter((s) => s.market === "FR"),
      us: enriched.filter((s) => s.market === "US"),
    };
  } catch (err) {
    console.error("[stocks] getMorningStocks fatal fallback:", err);
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS };
  }
}

export async function getEveningStocks(): Promise<{
  fr: StockData[];
  us: StockData[];
  summary: string;
}> {
  const MOCK_SUMMARY =
    "Séance marquée par des mouvements sectoriels divergents. Données mock — aucune source disponible.";

  try {
    const { stocks } = await fetchAllStocks([...FR_TICKERS, ...US_TICKERS], "cron");
    const enriched   = await enrichWithReasons(stocks);
    const fr         = enriched.filter((s) => s.market === "FR");
    const us         = enriched.filter((s) => s.market === "US");
    return { fr, us, summary: buildEveningSummary(fr, us) };
  } catch (err) {
    console.error("[stocks] getEveningStocks fatal fallback:", err);
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS, summary: MOCK_SUMMARY };
  }
}
