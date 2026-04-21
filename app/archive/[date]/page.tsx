import { prisma } from "@/lib/prisma";
import { MarketSection } from "@/components/MarketSection";
import { EveningRecap } from "@/components/EveningRecap";
import { type StockData } from "@/lib/mock-data";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function ArchiveDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  let morning = null;
  let evening = null;

  try {
    morning = await prisma.dailyBrief.findUnique({
      where: { date_type: { date, type: "morning" } },
      include: { stocks: true },
    });
    evening = await prisma.dailyBrief.findUnique({
      where: { date_type: { date, type: "evening" } },
      include: { stocks: true },
    });
  } catch {
    notFound();
  }

  if (!morning && !evening) {
    notFound();
  }

  const parsed = parseISO(date);
  const label = format(parsed, "EEEE d MMMM yyyy", { locale: fr });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);

  const frStocks: StockData[] = morning
    ? morning.stocks.filter((s) => s.market === "FR").map(toStockData)
    : [];
  const usStocks: StockData[] = morning
    ? morning.stocks.filter((s) => s.market === "US").map(toStockData)
    : [];

  return (
    <div className="bg-black min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-4">
        <Link
          href="/archive"
          className="text-sm text-[#86868b] hover:text-[#f5f5f7] transition-colors inline-block mb-8"
        >
          ← Archives
        </Link>
        <h1 className="text-5xl font-bold tracking-tight text-[#f5f5f7] mb-2">
          {capitalized}
        </h1>
      </div>

      {morning && usStocks.length > 0 && (
        <div className="border-t border-[#1c1c1e]">
          <MarketSection
            title="Marché Américain"
            subtitle="Actions US surveillées ce jour"
            stocks={usStocks}
          />
        </div>
      )}

      {morning && frStocks.length > 0 && (
        <div className="border-t border-[#1c1c1e]">
          <MarketSection
            title="Marché Français"
            subtitle="Actions FR surveillées ce jour"
            stocks={frStocks}
          />
        </div>
      )}

      {evening && (
        <div className="border-t border-[#1c1c1e]">
          <EveningRecap
            summary={evening.summary ?? ""}
            frStocks={evening.stocks.filter((s) => s.market === "FR").map(toStockData)}
            usStocks={evening.stocks.filter((s) => s.market === "US").map(toStockData)}
          />
        </div>
      )}

      <footer className="border-t border-[#1c1c1e] px-6 py-12 mt-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-[#48484a]">
            StockRadar est un outil d&apos;information. Ceci n&apos;est pas un conseil en investissement.
          </p>
        </div>
      </footer>
    </div>
  );
}
