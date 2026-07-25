import Link from "next/link";
import { AMF_DISCLAIMER } from "@/lib/legal";

export function SiteFooter() {
  return (
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

        <div className="flex flex-col items-center md:items-end gap-3">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link
              href="/archive"
              className="text-sm text-[#86868b] hover:text-[#f5f5f7] transition-colors"
            >
              Archives
            </Link>
            <Link
              href="/mentions-legales"
              className="text-sm text-[#86868b] hover:text-[#f5f5f7] transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              href="/confidentialite"
              className="text-sm text-[#86868b] hover:text-[#f5f5f7] transition-colors"
            >
              Confidentialité
            </Link>
          </nav>

          <p className="text-xs text-[#48484a] max-w-md text-center md:text-right leading-relaxed">
            {AMF_DISCLAIMER}
          </p>
        </div>
      </div>
    </footer>
  );
}
