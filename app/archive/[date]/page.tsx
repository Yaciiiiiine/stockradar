import { prisma } from "@/lib/prisma";
import { MarketSection } from "@/components/MarketSection";
import { EveningRecap } from "@/components/EveningRecap";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTransition } from "@/components/PageTransition";
import { type StockData } from "@/lib/mock-data";
import { generateSparkline } from "@/lib/sparkline";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function toStockData(s: {
  ticker: string;
  name: string;
  market: string;
  price: number;
  change: number;
  reason: string;
  preMarket?: number | null;
  volume?: number | null;
  sparkline?: number[] | null;
}): StockData {
  const stored = s.sparkline ?? [];
  return {
    ticker: s.ticker,
    name: s.name,
    market: s.market as "FR" | "US",
    price: s.price,
    change: s.change,
    reason: s.reason,
    preMarket: s.preMarket ?? undefined,
    volume: s.volume ?? undefined,
    // Briefs antérieurs à la colonne sparkline : série reconstruite.
    sparkline:
      stored.length >= 2 ? stored : generateSparkline(s.ticker, s.price, s.change),
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
    <PageTransition>
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
              frStocks={evening.stocks
                .filter((s) => s.market === "FR")
                .map(toStockData)}
              usStocks={evening.stocks
                .filter((s) => s.market === "US")
                .map(toStockData)}
            />
          </div>
        )}

        <div className="mt-12">
          <SiteFooter />
        </div>
      </div>
    </PageTransition>
  );
}
