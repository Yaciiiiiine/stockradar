"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSpring, useMotionValueEvent } from "motion/react";
import { NUMBER_SPRING, useReducedMotion } from "@/lib/motion";

/**
 * useLayoutEffect côté client, useEffect au rendu serveur.
 *
 * L'amorçage doit se faire avant la peinture, sinon le navigateur affiche la
 * valeur finale une frame puis la voit retomber à zéro : un clignotement.
 * useLayoutEffect n'existe pas au SSR, d'où la bascule.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  /** Préfixe collé au nombre, ex. "$" ou "€". */
  prefix?: string;
  /** Suffixe collé au nombre, ex. "%". */
  suffix?: string;
  /** Force un "+" devant les valeurs positives. */
  signed?: boolean;
  className?: string;
}

function format(
  value: number,
  decimals: number,
  prefix: string,
  suffix: string,
  signed: boolean
): string {
  const sign = signed && value >= 0 ? "+" : "";
  return `${sign}${prefix}${value.toFixed(decimals)}${suffix}`;
}

/**
 * Compteur qui roule jusqu'à sa valeur au montage.
 *
 * Le rendu serveur porte déjà la valeur finale : sans JavaScript, ou avec
 * `prefers-reduced-motion: reduce`, le chiffre exact est lisible immédiatement.
 * L'animation ne fait que rejouer le trajet après hydratation.
 */
export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  signed = false,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, NUMBER_SPRING);
  const [display, setDisplay] = useState(() =>
    format(value, decimals, prefix, suffix, signed)
  );
  const started = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (reduced) {
      // Préférence sobre : on reste sur la valeur finale, déjà affichée.
      spring.jump(value);
      setDisplay(format(value, decimals, prefix, suffix, signed));
      return;
    }

    if (!started.current) {
      // Premier passage : on repart de zéro et on laisse le ressort remonter.
      started.current = true;
      spring.jump(0);
      setDisplay(format(0, decimals, prefix, suffix, signed));
    }

    spring.set(value);
  }, [value, reduced, decimals, prefix, suffix, signed, spring]);

  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(format(latest, decimals, prefix, suffix, signed));
  });

  // tabular-nums évite que la largeur danse pendant que les chiffres défilent.
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}
