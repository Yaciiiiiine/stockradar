"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface HeroProps {
  date: Date;
}

export function Hero({ date }: HeroProps) {
  const formattedDate = format(date, "EEEE d MMMM yyyy", { locale: fr });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1c1e]/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-xs font-medium text-[#86868b] border border-[#3a3a3e] rounded-full px-3 py-1 tracking-wider uppercase">
            Beta
          </span>
        </div>

        <h1 className="text-[clamp(56px,12vw,120px)] font-bold tracking-[-4px] text-[#f5f5f7] leading-none mb-6">
          StockRadar.
        </h1>

        <p className="text-xl md:text-2xl text-[#86868b] font-light tracking-tight max-w-2xl mx-auto leading-relaxed mb-10">
          Les 10 actions françaises et américaines à surveiller.{" "}
          <span className="text-[#f5f5f7]">Chaque jour.</span>
        </p>

        <p className="text-base text-[#48484a] font-medium tracking-wide">
          {capitalizedDate}
        </p>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#48484a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}
