import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  const updated = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(LEGAL_LAST_UPDATED));

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-24">
        <Link
          href="/"
          className="text-sm text-[#86868b] hover:text-[#f5f5f7] transition-colors inline-block"
        >
          ← StockRadar
        </Link>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#f5f5f7] mt-8">
          {title}
        </h1>
        <p className="text-lg text-[#86868b] mt-4 leading-relaxed">{intro}</p>
        <p className="text-xs text-[#48484a] mt-6">
          Dernière mise à jour : {updated}
        </p>

        <div className="mt-16 space-y-14">{children}</div>
      </div>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight text-[#f5f5f7] mb-5">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] text-[#86868b] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** Rend une valeur légale, ou un marqueur visible si elle n'est pas remplie. */
export function LegalField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2.5 border-b border-[#1c1c1e] last:border-0">
      <dt className="text-[#48484a] text-sm sm:w-56 shrink-0">{label}</dt>
      <dd className="text-[#f5f5f7] text-[15px]">
        {value ?? (
          <span className="inline-flex items-center gap-2 text-[#ff3b30] text-sm font-medium">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff3b30]"
            />
            À compléter par l&apos;éditeur
          </span>
        )}
      </dd>
    </div>
  );
}
