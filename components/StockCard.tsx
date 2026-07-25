"use client";

import { StockData } from "@/lib/mock-data";
import { AnimatedNumber } from "@/components/AnimatedNumber";

interface StockCardProps {
  stock: StockData;
  index: number;
}

export function StockCard({ stock, index }: StockCardProps) {
  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? "text-[#34c759]" : "text-[#ff3b30]";

  return (
    <div
      className="group bg-[#1c1c1e] rounded-2xl p-6 hover:bg-[#2c2c2e] transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-default"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#f5f5f7] tabular-nums">
              {stock.ticker}
            </span>
            <AnimatedNumber
              value={stock.change}
              suffix="%"
              signed
              className={`text-lg font-semibold ${changeColor}`}
            />
          </div>
          <div className="text-sm text-[#86868b] mt-1 truncate">{stock.name}</div>
        </div>
        <div className="text-right shrink-0">
          <AnimatedNumber
            value={stock.price}
            prefix={stock.market === "US" ? "$" : "€"}
            className="block text-lg font-semibold text-[#f5f5f7]"
          />
          <div
            className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full tabular-nums ${
              isPositive
                ? "bg-[#34c759]/10 text-[#34c759]"
                : "bg-[#ff3b30]/10 text-[#ff3b30]"
            }`}
          >
            <AnimatedNumber value={stock.change} suffix="%" signed />
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-[#86868b] leading-relaxed line-clamp-3">
        {stock.reason}
      </p>
    </div>
  );
}
