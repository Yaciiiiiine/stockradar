"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[APP] Erreur non gérée :", error);
  }, [error]);

  return (
    <main className="bg-black min-h-screen flex flex-col justify-center items-center text-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1c1e]/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto animate-fade-in-up">
        <p className="text-sm font-medium text-[#48484a] tracking-[0.2em] uppercase mb-6">
          Erreur
        </p>

        <h1 className="text-[clamp(40px,8vw,72px)] font-bold tracking-[-2.5px] text-[#f5f5f7] leading-none mb-6">
          Quelque chose a cassé.
        </h1>

        <p className="text-lg md:text-xl text-[#86868b] font-light tracking-tight leading-relaxed mb-10">
          Le briefing n&apos;a pas pu être chargé. C&apos;est probablement temporaire —
          réessayez dans un instant.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="bg-[#f5f5f7] text-black text-sm font-semibold px-7 py-3.5 rounded-full hover:bg-white transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="text-sm text-[#86868b] hover:text-[#f5f5f7] border border-[#3a3a3e] hover:border-[#48484a] px-7 py-3.5 rounded-full transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

        {error.digest && (
          <p className="text-xs text-[#48484a] mt-10 font-mono tracking-wide">
            Référence : {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
