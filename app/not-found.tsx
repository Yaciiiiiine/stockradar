import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-black min-h-screen flex flex-col justify-center items-center text-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1c1e]/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto animate-fade-in-up">
        <p className="text-sm font-medium text-[#48484a] tracking-[0.2em] uppercase mb-6">
          Erreur 404
        </p>

        <h1 className="text-[clamp(48px,10vw,88px)] font-bold tracking-[-3px] text-[#f5f5f7] leading-none mb-6">
          Page introuvable.
        </h1>

        <p className="text-lg md:text-xl text-[#86868b] font-light tracking-tight leading-relaxed mb-10">
          Cette page n&apos;existe pas ou n&apos;existe plus. Le briefing que vous
          cherchez est peut-être dans les archives.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-[#f5f5f7] text-black text-sm font-semibold px-7 py-3.5 rounded-full hover:bg-white transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/archive"
            className="text-sm text-[#86868b] hover:text-[#f5f5f7] border border-[#3a3a3e] hover:border-[#48484a] px-7 py-3.5 rounded-full transition-colors"
          >
            Voir les archives
          </Link>
        </div>
      </div>
    </main>
  );
}
