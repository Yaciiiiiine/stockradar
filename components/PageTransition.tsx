import { ViewTransition } from "react";

/**
 * Enveloppe le contenu d'une page pour l'animer à la navigation.
 *
 * `default="none"` est délibéré : sans lui, cette transition se déclencherait
 * aussi sur des mises à jour sans rapport, et au premier chargement — la page
 * d'arrivée apparaîtrait en fondu alors que rien n'a été quitté.
 *
 * Le style vit dans globals.css, sous `::view-transition-*`, ce qui le rend
 * neutralisable par la media query prefers-reduced-motion au même endroit que
 * le reste.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
