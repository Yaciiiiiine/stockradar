import { StockData, MOCK_FR_STOCKS, MOCK_US_STOCKS } from "./mock-data";
import { fetchAllStocks, buildEveningSummary } from "./finnhub";

const MOCK_EVENING_SUMMARY_FALLBACK =
  "Séance marquée par des mouvements sectoriels divergents. La technologie et la défense ont surperformé tandis que l'énergie a subi des prises de profit. Les indices européens terminent en légère hausse, portés par les valeurs industrielles.";

export async function getMorningStocks(): Promise<{ fr: StockData[]; us: StockData[] }> {
  const token = process.env.STOCK_API_KEY;

  // Pas de clé → mock immédiat
  if (!token) {
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS };
  }

  try {
    const { fr, us } = await fetchAllStocks(token);
    return { fr, us };
  } catch (err) {
    // Erreur globale inattendue → fallback complet
    console.error("[stocks] getMorningStocks failed, falling back to mock:", err);
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS };
  }
}

export async function getEveningStocks(): Promise<{
  fr: StockData[];
  us: StockData[];
  summary: string;
}> {
  const token = process.env.STOCK_API_KEY;

  if (!token) {
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS, summary: MOCK_EVENING_SUMMARY_FALLBACK };
  }

  try {
    const { fr, us } = await fetchAllStocks(token);
    const summary = buildEveningSummary(fr, us);
    return { fr, us, summary };
  } catch (err) {
    console.error("[stocks] getEveningStocks failed, falling back to mock:", err);
    return { fr: MOCK_FR_STOCKS, us: MOCK_US_STOCKS, summary: MOCK_EVENING_SUMMARY_FALLBACK };
  }
}
