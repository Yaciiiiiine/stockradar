import { prisma } from "@/lib/prisma";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getArchiveDates() {
  try {
    const briefs = await prisma.dailyBrief.findMany({
      orderBy: { date: "desc" },
      select: { date: true, type: true },
      take: 60,
    });

    const dateMap = new Map<string, { morning: boolean; evening: boolean }>();
    for (const b of briefs) {
      const existing = dateMap.get(b.date) ?? { morning: false, evening: false };
      if (b.type === "morning") existing.morning = true;
      if (b.type === "evening") existing.evening = true;
      dateMap.set(b.date, existing);
    }

    return Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  } catch {
    return [];
  }
}

export default async function ArchivePage() {
  const dates = await getArchiveDates();

  return (
    <div className="bg-black min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <div className="mb-16">
          <Link
            href="/"
            className="text-sm text-[#86868b] hover:text-[#f5f5f7] transition-colors mb-8 inline-block"
          >
            ← StockRadar
          </Link>
          <h1 className="text-6xl font-bold tracking-tight text-[#f5f5f7] mt-6">
            Archives
          </h1>
          <p className="text-xl text-[#86868b] mt-3">
            Tous les briefings passés.
          </p>
        </div>

        {dates.length === 0 ? (
          <div className="bg-[#1c1c1e] rounded-2xl p-12 text-center">
            <p className="text-[#86868b] text-lg">
              Aucun briefing archivé pour le moment.
            </p>
            <p className="text-[#48484a] text-sm mt-2">
              Les briefings apparaîtront ici après leur génération.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dates.map(([date, { morning, evening }]) => {
              const parsed = parseISO(date);
              const label = format(parsed, "EEEE d MMMM yyyy", { locale: fr });
              const capitalized = label.charAt(0).toUpperCase() + label.slice(1);

              return (
                <Link
                  key={date}
                  href={`/archive/${date}`}
                  className="block bg-[#1c1c1e] rounded-2xl p-6 hover:bg-[#2c2c2e] transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#f5f5f7] font-semibold text-lg group-hover:text-white transition-colors">
                        {capitalized}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {morning && (
                          <span className="text-xs text-[#86868b] border border-[#3a3a3e] rounded-full px-2 py-0.5">
                            Briefing matinal
                          </span>
                        )}
                        {evening && (
                          <span className="text-xs text-[#86868b] border border-[#3a3a3e] rounded-full px-2 py-0.5">
                            Compte-rendu du soir
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#48484a"
                      strokeWidth="2"
                      className="group-hover:stroke-[#86868b] transition-colors"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
