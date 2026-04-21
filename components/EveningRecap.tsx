"use client";

import { StockData } from "@/lib/mock-data";

interface EveningRecapProps {
  summary: string;
  frStocks: StockData[];
  usStocks: StockData[];
  isYesterday?: boolean;
}

export function EveningRecap({ summary, frStocks, usStocks, isYesterday }: EveningRecapProps) {
  const allStocks = [...frStocks, ...usStocks];
  const top3 = [...allStocks].sort((a, b) => b.change - a.change).slice(0, 3);
  const bot3 = [...allStocks].sort((a, b) => a.change - b.change).slice(0, 3);

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="mb-12 flex items-center gap-4">
        <h2 className="text-5xl font-bold tracking-tight text-[#f5f5f7]">
          Compte-rendu du soir
        </h2>
        {isYesterday && (
          <span className="text-xs font-medium text-[#86868b] border border-[#3a3a3e] rounded-full px-3 py-1 whitespace-nowrap self-start mt-3">
            Hier soir
          </span>
        )}
      </div>

      <div className="bg-[#1c1c1e] rounded-2xl p-8 mb-10">
        <p className="text-lg text-[#86868b] leading-relaxed">{summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1c1c1e] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#86868b] uppercase tracking-wider mb-5">
            Top hausses du jour
          </h3>
          <div className="space-y-4">
            {top3.map((s) => (
              <div key={s.ticker} className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#f5f5f7] text-lg">{s.ticker}</span>
                  <span className="text-[#86868b] text-sm ml-2">{s.name}</span>
                </div>
                <span className="font-bold tabular-nums text-[#34c759]">
                  +{s.change.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1c1c1e] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#86868b] uppercase tracking-wider mb-5">
            Top baisses du jour
          </h3>
          <div className="space-y-4">
            {bot3.map((s) => (
              <div key={s.ticker} className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#f5f5f7] text-lg">{s.ticker}</span>
                  <span className="text-[#86868b] text-sm ml-2">{s.name}</span>
                </div>
                <span className="font-bold tabular-nums text-[#ff3b30]">
                  {s.change.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
