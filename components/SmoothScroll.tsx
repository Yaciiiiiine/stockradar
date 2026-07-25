"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "@/lib/motion";

/**
 * Défilement fluide global.
 *
 * Ne rend rien : monté une fois dans le layout racine, il se contente de
 * piloter le scroll de la page. Sous `prefers-reduced-motion: reduce`, il ne
 * s'initialise pas du tout — Lenis intercepte les événements de molette, et
 * un utilisateur qui a demandé la sobriété doit retrouver le défilement natif
 * exact, pas une version adoucie.
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      // Assez court pour ne pas donner l'impression de nager, assez long pour
      // que le mouvement se voie.
      duration: 0.9,
      smoothWheel: true,
      // Le défilement tactile reste natif : le détourner sur mobile agace
      // plus qu'il ne séduit, et casse l'inertie attendue du système.
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}
