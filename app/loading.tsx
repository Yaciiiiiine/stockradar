export default function Loading() {
  return (
    <div className="bg-black min-h-screen" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement du briefing…</span>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-pulse">
          <div className="h-6 w-20 rounded-full bg-[#1c1c1e] mb-8" />
          <div className="h-20 md:h-28 w-[min(100%,560px)] rounded-2xl bg-[#1c1c1e] mb-6" />
          <div className="h-6 w-[min(100%,420px)] rounded-full bg-[#1c1c1e] mb-3" />
          <div className="h-6 w-[min(80%,320px)] rounded-full bg-[#1c1c1e] mb-10" />
          <div className="h-4 w-56 rounded-full bg-[#1c1c1e]" />
        </div>
      </section>

      {/* Une section de marché */}
      <div className="border-t border-[#1c1c1e]">
        <div className="max-w-7xl mx-auto px-6 py-24 animate-pulse">
          <div className="h-10 w-72 rounded-xl bg-[#1c1c1e] mb-3" />
          <div className="h-5 w-96 max-w-full rounded-full bg-[#1c1c1e] mb-12" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-[#1c1c1e] rounded-2xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="h-5 w-20 rounded bg-[#2c2c2e] mb-2" />
                    <div className="h-3.5 w-32 rounded bg-[#2c2c2e]" />
                  </div>
                  <div className="h-5 w-16 rounded bg-[#2c2c2e]" />
                </div>
                <div className="h-3.5 w-full rounded bg-[#2c2c2e] mb-2" />
                <div className="h-3.5 w-4/5 rounded bg-[#2c2c2e]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
