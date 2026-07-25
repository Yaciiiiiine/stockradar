/**
 * Séries intraday alimentant les sparklines.
 *
 * Une journée de bourse fait 6h30, soit 78 points à l'intervalle 5 minutes.
 * On échantillonne toute série réelle à cette taille pour que le tracé ait le
 * même coût quel que soit le marché.
 */
export const SPARKLINE_POINTS = 78;

/**
 * PRNG déterministe (mulberry32).
 *
 * Déterminisme obligatoire : la série mock est calculée au rendu serveur, et
 * une valeur aléatoire produirait un HTML différent à chaque requête — donc
 * une incohérence d'hydratation si le composant venait à la recalculer.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Fabrique une série plausible cohérente avec la variation du jour.
 *
 * Part du cours d'ouverture impliqué par `changePercent`, marche aléatoirement
 * jusqu'au cours de clôture, et force les deux extrémités : le tracé raconte
 * exactement la variation affichée sur la carte, jamais l'inverse.
 */
export function generateSparkline(
  ticker: string,
  price: number,
  changePercent: number,
  points: number = SPARKLINE_POINTS
): number[] {
  if (!Number.isFinite(price) || price <= 0 || points < 2) return [];

  const open = price / (1 + changePercent / 100);
  const random = mulberry32(seedFrom(ticker));

  // Amplitude du bruit : proportionnelle au mouvement du jour, avec un plancher
  // pour qu'une séance atone ne donne pas une ligne parfaitement droite.
  const span = Math.abs(price - open);
  const noise = Math.max(span * 0.35, price * 0.0015);

  const series: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // Tendance de fond, adoucie aux extrémités.
    const trend = open + (price - open) * t;
    // Le bruit s'estompe en fin de séance pour converger proprement.
    const envelope = Math.sin(Math.PI * t) * (1 - t * 0.35);
    series.push(trend + (random() - 0.5) * 2 * noise * envelope);
  }

  series[0] = open;
  series[points - 1] = price;
  return series.map((v) => Math.max(v, 0.01));
}

/**
 * Complète une liste d'actions dont la série manque.
 *
 * Sert aux données mock de la page d'accueil : la génération est déterministe,
 * donc serveur et client produisent la même série et l'hydratation reste
 * cohérente.
 */
export function withSparklines<
  T extends { ticker: string; price: number; change: number; sparkline?: number[] },
>(stocks: T[]): T[] {
  return stocks.map((s) =>
    s.sparkline && s.sparkline.length >= 2
      ? s
      : { ...s, sparkline: generateSparkline(s.ticker, s.price, s.change) }
  );
}

/** Ramène une série de longueur quelconque à `points` valeurs, extrémités conservées. */
export function resample(
  values: number[],
  points: number = SPARKLINE_POINTS
): number[] {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length === 0) return [];
  if (clean.length <= points) return clean;

  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const idx = Math.round((i / (points - 1)) * (clean.length - 1));
    out.push(clean[idx]);
  }
  return out;
}
