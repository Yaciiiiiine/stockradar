"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message ?? "Vérifiez votre boîte mail pour confirmer votre inscription.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Une erreur est survenue.");
      }
    } catch {
      setStatus("error");
      setMessage("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  return (
    <section className="py-32 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-5xl font-bold tracking-tight text-[#f5f5f7] mb-4">
          Restez informé.
        </h2>
        <p className="text-xl text-[#86868b] mb-12 leading-relaxed">
          Recevez le briefing matinal à 8h et le compte-rendu du soir à 22h30.
          Directement dans votre boîte mail.
        </p>

        {status === "success" ? (
          <div className="bg-[#1c1c1e] rounded-2xl p-8">
            <div className="text-[#34c759] text-2xl font-semibold mb-2">Parfait.</div>
            <p className="text-[#86868b]">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              disabled={status === "loading"}
              className="flex-1 bg-[#1c1c1e] border border-[#3a3a3e] rounded-xl px-5 py-4 text-[#f5f5f7] placeholder-[#48484a] focus:outline-none focus:border-[#86868b] transition-colors text-base disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#f5f5f7] text-[#000] font-semibold px-7 py-4 rounded-xl text-base hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {status === "loading" ? "..." : "S'abonner"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-4 text-[#ff3b30] text-sm">{message}</p>
        )}

        <p className="mt-6 text-xs text-[#48484a]">
          Gratuit. Désinscription en un clic. Aucun spam.
        </p>
      </div>
    </section>
  );
}
