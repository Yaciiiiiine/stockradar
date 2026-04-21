"use client";

import { StockData } from "@/lib/mock-data";
import { StockCard } from "./StockCard";

interface MarketSectionProps {
  title: string;
  subtitle: string;
  stocks: StockData[];
}

export function MarketSection({ title, subtitle, stocks }: MarketSectionProps) {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-5xl font-bold tracking-tight text-[#f5f5f7] mb-3">
          {title}
        </h2>
        <p className="text-xl text-[#86868b]">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stocks.slice(0, 10).map((stock, i) => (
          <StockCard key={stock.ticker} stock={stock} index={i} />
        ))}
      </div>
    </section>
  );
}
