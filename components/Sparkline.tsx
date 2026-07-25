"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SPARKLINE_HEIGHT } from "@/components/SparklineChart";

interface SparklineProps {
  values?: number[];
  change: number;
  ticker: string;
}

/**
 * Repli statique : une ligne plate grise à la hauteur exacte du graphe.
 *
 * Sert de fallback pendant le chargement du module, en rendu serveur, et quand
 * la série est absente ou trop courte. Réserver la hauteur définitive évite
 * tout décalage de mise en page quand le vrai tracé arrive.
 */
function SparklineFallback() {
  return (
    <div
      style={{ height: SPARKLINE_HEIGHT }}
      className="w-full flex items-center"
      aria-hidden="true"
    >
      <div className="w-full h-px bg-[#3a3a3e]" />
    </div>
  );
}

/**
 * lightweight-charts pèse une centaine de kilo-octets et touche au canvas :
 * il n'a rien à faire dans le rendu serveur ni dans le bundle initial.
 */
const SparklineChart = dynamic(() => import("@/components/SparklineChart"), {
  ssr: false,
  loading: () => <SparklineFallback />,
});

export function Sparkline({ values, change, ticker }: SparklineProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  /**
   * La page affiche vingt cartes. Instancier vingt canvas dès l'hydratation
   * occupe le fil principal au pire moment, juste après le premier rendu.
   * Chaque graphe attend donc d'approcher du viewport ; le repli occupe la
   * place exacte en attendant, donc rien ne bouge quand il arrive.
   */
  useEffect(() => {
    const node = slotRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const drawable = Boolean(values && values.length >= 2);
  const direction = change >= 0 ? "en hausse" : "en baisse";
  const label = `Évolution intraday de ${ticker}, ${direction} de ${Math.abs(change).toFixed(2)} %`;

  return (
    <div ref={slotRef}>
      {drawable && visible ? (
        <SparklineChart values={values!} change={change} label={label} />
      ) : (
        <SparklineFallback />
      )}
    </div>
  );
}
