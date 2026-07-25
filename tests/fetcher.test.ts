import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StockQuote, StockSource } from "@/lib/sources/types";
import type { TickerDef } from "@/lib/sources/tickers";

// Le logger écrit sur le disque et pollue la sortie : on le neutralise.
vi.mock("@/lib/logger", () => ({
  logConsole: vi.fn(),
  appendRun: vi.fn(),
  writeAlert: vi.fn(),
}));

const finnhubFetchQuote = vi.fn<(symbol: string) => Promise<StockQuote>>();
const yahooFetchQuote = vi.fn<(symbol: string) => Promise<StockQuote>>();

vi.mock("@/lib/sources/finnhub", () => ({
  getFinnhubSource: (): StockSource => ({
    name: "finnhub",
    priority: 1,
    // Le plan gratuit ne couvre pas les suffixes européens.
    canFetch: (symbol: string) => !symbol.includes("."),
    fetchQuote: finnhubFetchQuote,
  }),
}));

vi.mock("@/lib/sources/yahoo", () => ({
  yahooSource: {
    name: "yahoo",
    priority: 2,
    canFetch: () => true,
    fetchQuote: yahooFetchQuote,
  } satisfies StockSource,
}));

const { fetchAllStocks } = await import("@/lib/fetcher");
const { writeAlert } = await import("@/lib/logger");

function quote(symbol: string, price: number, source: string): StockQuote {
  return {
    symbol,
    price,
    change: 1,
    changePercent: 0.5,
    timestamp: 1_750_000_000_000,
    source,
  };
}

const AAPL: TickerDef = { symbol: "AAPL", name: "Apple Inc.", market: "US" };
const LVMH: TickerDef = { symbol: "MC.PA", name: "LVMH", market: "FR" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchAllStocks — fallback mock", () => {
  it("retombe sur les données mock quand toutes les sources échouent", async () => {
    finnhubFetchQuote.mockRejectedValue(new Error("Finnhub 500"));
    yahooFetchQuote.mockRejectedValue(new Error("Yahoo indisponible"));

    const { stocks, runLog } = await fetchAllStocks([AAPL, LVMH]);

    // Le pipeline ne rejette jamais : il renvoie autant d'entrées que de tickers.
    expect(stocks).toHaveLength(2);
    expect(runLog.summary.mock_used).toBe(2);
    expect(runLog.summary.finnhub_success).toBe(0);
    expect(runLog.summary.yahoo_fallback_success).toBe(0);

    // Les prix viennent du mock, donc non nuls et non issus des sources.
    const apple = stocks.find((s) => s.ticker === "AAPL");
    expect(apple).toBeDefined();
    expect(apple!.price).toBeGreaterThan(0);

    // Le suffixe de marché est retiré du ticker affiché.
    expect(stocks.map((s) => s.ticker)).toEqual(["AAPL", "MC"]);

    for (const result of runLog.tickers) {
      expect(result.final_source).toBe("mock");
    }
  });

  it("n'utilise le mock que pour les tickers en échec", async () => {
    finnhubFetchQuote.mockResolvedValue(quote("AAPL", 268.01, "finnhub"));
    yahooFetchQuote.mockRejectedValue(new Error("Yahoo indisponible"));

    const { runLog } = await fetchAllStocks([AAPL, LVMH]);

    // AAPL passe par Finnhub, MC.PA n'a plus aucune source disponible.
    expect(runLog.summary.mock_used).toBe(1);
    expect(runLog.tickers.find((t) => t.symbol === "AAPL")!.final_source).toBe(
      "finnhub"
    );
    expect(runLog.tickers.find((t) => t.symbol === "MC.PA")!.final_source).toBe(
      "mock"
    );
  });
});

describe("fetchAllStocks — cross-check Finnhub / Yahoo", () => {
  it("compare les deux sources et n'alerte pas sous le seuil de 1 %", async () => {
    finnhubFetchQuote.mockResolvedValue(quote("AAPL", 200, "finnhub"));
    yahooFetchQuote.mockResolvedValue(quote("AAPL", 201, "yahoo"));

    const { runLog } = await fetchAllStocks([AAPL]);
    const comparison = runLog.tickers[0].comparison;

    expect(runLog.summary.comparisons_done).toBe(1);
    expect(comparison).not.toBeNull();
    expect(comparison!.delta_pct).toBeCloseTo(0.5, 5);
    expect(comparison!.alert).toBe(false);
    expect(comparison!.critical).toBe(false);
    expect(runLog.summary.comparisons_alerts).toBe(0);
    expect(writeAlert).not.toHaveBeenCalled();
  });

  it("alerte en critique au-delà de 3 % et garde le prix de la source primaire", async () => {
    finnhubFetchQuote.mockResolvedValue(quote("AAPL", 200, "finnhub"));
    yahooFetchQuote.mockResolvedValue(quote("AAPL", 220, "yahoo"));

    const { stocks, runLog } = await fetchAllStocks([AAPL]);
    const comparison = runLog.tickers[0].comparison;

    expect(comparison!.delta_pct).toBeCloseTo(10, 5);
    expect(comparison!.alert).toBe(true);
    expect(comparison!.critical).toBe(true);
    expect(runLog.summary.comparisons_alerts).toBe(1);
    expect(writeAlert).toHaveBeenCalledWith(
      "PRICE_DELTA_CRITICAL",
      expect.stringContaining("AAPL")
    );

    // Une divergence reste une alerte interne : Finnhub fait foi sur les US.
    expect(stocks[0].price).toBe(200);
    expect(runLog.tickers[0].final_source).toBe("finnhub");
  });

  it("ne compare pas quand une seule source répond", async () => {
    finnhubFetchQuote.mockResolvedValue(quote("AAPL", 200, "finnhub"));
    yahooFetchQuote.mockRejectedValue(new Error("Yahoo indisponible"));

    const { runLog } = await fetchAllStocks([AAPL]);

    expect(runLog.summary.comparisons_done).toBe(0);
    expect(runLog.tickers[0].comparison).toBeNull();
    expect(writeAlert).not.toHaveBeenCalled();
  });
});
