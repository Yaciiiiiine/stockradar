import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Active l'intégration Next du composant <ViewTransition> de React, qui
     * déclenche les transitions au changement de route.
     *
     * Choisi plutôt qu'une animation portée par `motion` : les View
     * Transitions sont natives au navigateur, pilotées en CSS, et n'ajoutent
     * donc rien au bundle client. Sans support navigateur, la navigation
     * fonctionne normalement, elle ne s'anime simplement pas.
     */
    viewTransition: true,
  },
};

export default nextConfig;
