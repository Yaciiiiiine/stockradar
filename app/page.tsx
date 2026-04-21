import { Hero } from "@/components/Hero";
import { MarketSection } from "@/components/MarketSection";
import { EveningRecap } from "@/components/EveningRecap";
import { NewsletterForm } from "@/components/NewsletterForm";
import { MOCK_FR_STOCKS, MOCK_US_STOCKS, MOCK_EVENING_SUMMARY, type StockData } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

function toStockData(s: {
  ticker: string; name: string; market: string; price: number;
  change: number; reason: string; preMarket?: number | null; volume?: number | null;
}): StockData {
  return {
    ticker: s.ticker,
    name: s.name,
    market: s.market as "FR" | "US",
    price: s.price,
    change: s.change,
    reason: s.reason,
    preMarket: s.preMarket ?? undefined,
    volume: s.volume ?? undefined,
  };
}

async function getTodayBriefs() {
  const today = format(new Date(), "yyyy-MM-dd");
  try {
    const morning = await prisma.dailyBrief.findUnique({
      where: { date_type: { date: today, type: "morning" } },
      include: { stocks: true },
    });
    const evening = await prisma.dailyBrief.findUnique({
      where: { date_type: { date: today, type: "evening" } },
      include: { stocks: true },
    });
    return { morning, evening, today };
  } catch {
    return { morning: null, evening: null, today };
  }
}

async function getYesterdayEvening() {
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
  try {
    return await prisma.dailyBrief.findUnique({
      where: { date_type: { date: yesterday, type: "evening" } },
      include: { stocks: true },
    });
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const { morning, evening } = await getTodayBriefs();

  const frStocks: StockData[] = morning
    ? morning.stocks.filter((s) => s.market === "FR").map(toStockData)
    : MOCK_FR_STOCKS;
  const usStocks: StockData[] = morning
    ? morning.stocks.filter((s) => s.market === "US").map(toStockData)
    : MOCK_US_STOCKS;

  const nowParis = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
  const showEveningSection = nowParis.getHours() >= 18;

  let eveningData: { frStocks: StockData[]; usStocks: StockData[]; summary: string; isYesterday: boolean } | null = null;

  if (showEveningSection) {
    if (evening) {
      eveningData = {
        frStocks: evening.stocks.filter((s) => s.market === "FR").map(toStockData),
        usStocks: evening.stocks.filter((s) => s.market === "US").map(toStockData),
        summary: evening.summary ?? MOCK_EVENING_SUMMARY,
        isYesterday: false,
      };
    } else {
      eveningData = { frStocks, usStocks, summary: MOCK_EVENING_SUMMARY, isYesterday: false };
    }
  } else {
    const yesterdayEvening = await getYesterdayEvening();
    if (yesterdayEvening) {
      eveningData = {
        frStocks: yesterdayEvening.stocks.filter((s) => s.market === "FR").map(toStockData),
        usStocks: yesterdayEvening.stocks.filter((s) => s.market === "US").map(toStockData),
        summary: yesterdayEvening.summary ?? MOCK_EVENING_SUMMARY,
        isYesterday: true,
      };
    } else {
      eveningData = { frStocks, usStocks, summary: MOCK_EVENING_SUMMARY, isYesterday: true };
    }
  }

  return (
    <div className="bg-black">
      <Hero date={new Date()} />

      <div className="border-t border-[#1c1c1e]">
        <MarketSection
          title="Marché Américain"
          subtitle="10 actions US à surveiller aujourd'hui"
          stocks={usStocks}
        />
      </div>

      <div className="border-t border-[#1c1c1e]">
        <MarketSection
          title="Marché Français"
          subtitle="10 actions FR à surveiller aujourd'hui"
          stocks={frStocks}
        />
      </div>

      {eveningData && (
        <div className="border-t border-[#1c1c1e]">
          <EveningRecap
            summary={eveningData.summary}
            frStocks={eveningData.frStocks}
            usStocks={eveningData.usStocks}
            isYesterday={eveningData.isYesterday}
          />
        </div>
      )}

      <div className="border-t border-[#1c1c1e]">
        <NewsletterForm />
      </div>

      <footer className="border-t border-[#1c1c1e] px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-bold text-[#f5f5f7] text-lg tracking-tight">
              StockRadar{" "}
              <span className="text-xs font-normal text-[#86868b] border border-[#3a3a3e] rounded-full px-2 py-0.5 ml-1">
                Beta
              </span>
            </div>
            <p className="text-xs text-[#48484a] mt-1">
              &copy; {new Date().getFullYear()} StockRadar
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <Link
              href="/archive"
              className="text-sm text-[#86868b] hover:text-[#f5f5f7] transition-colors"
            >
              Archives
            </Link>
            <p className="text-xs text-[#48484a] max-w-sm text-center md:text-right leading-relaxed">
              StockRadar est un outil d&apos;information. Ceci n&apos;est pas un
              conseil en investissement. Faites vos propres recherches.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
