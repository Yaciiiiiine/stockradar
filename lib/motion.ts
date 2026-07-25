"use client";

import { useSyncExternalStore } from "react";

/**
 * Socle d'animation partagé.
 *
 * Toute animation du site passe par ici. `useReducedMotion()` est la seule
 * source de vérité pour `prefers-reduced-motion: reduce` : un composant animé
 * qui ne la consulte pas est un bug, pas un oubli de style.
 *
 * Le pendant CSS est dans globals.css, qui neutralise transitions, animations
 * et View Transitions sous la même media query — les deux doivent rester
 * cohérents.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Côté serveur on répond « oui, mouvement réduit ».
 *
 * La préférence est inconnue au rendu serveur. Partir de l'état sobre garantit
 * que le HTML initial — celui qui détermine le LCP — porte déjà les valeurs
 * finales, jamais un état d'animation intermédiaire. Les animations démarrent
 * après hydratation, uniquement si l'utilisateur les accepte.
 */
function getServerSnapshot(): boolean {
  return true;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Transition de référence : courbe « ease-out expo », sortie franche puis
 * ralentissement long. C'est la sensation Apple, et elle évite le rebond
 * élastique qui jure avec une donnée financière.
 */
export const TRANSITION = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1],
} as const;

/**
 * Ressort des compteurs chiffrés. Volontairement amorti : un prix qui dépasse
 * sa valeur puis revient afficherait un montant faux, même une fraction de
 * seconde.
 */
export const NUMBER_SPRING = {
  stiffness: 90,
  damping: 20,
  mass: 1,
  restDelta: 0.001,
} as const;

/** Durée du tracé progressif des sparklines, en millisecondes. */
export const SPARKLINE_DRAW_MS = 800;

/** Décalage en cascade entre deux cartes voisines, en secondes. */
export const STAGGER_STEP = 0.06;
