import { describe, it, expect } from "vitest";
import {
  generateSparkline,
  resample,
  withSparklines,
  SPARKLINE_POINTS,
} from "@/lib/sparkline";

describe("generateSparkline", () => {
  it("produit une série de la longueur attendue", () => {
    expect(generateSparkline("AAPL", 268.01, 0.82)).toHaveLength(SPARKLINE_POINTS);
  });

  it("finit exactement sur le cours affiché", () => {
    const series = generateSparkline("AAPL", 268.01, 0.82);
    expect(series.at(-1)).toBeCloseTo(268.01, 10);
  });

  it("part du cours d'ouverture impliqué par la variation", () => {
    const price = 268.01;
    const change = 0.82;
    const series = generateSparkline("AAPL", price, change);
    expect(series[0]).toBeCloseTo(price / (1 + change / 100), 10);
  });

  it("monte sur une variation positive, descend sur une négative", () => {
    const up = generateSparkline("AAPL", 100, 5);
    const down = generateSparkline("AAPL", 100, -5);
    // Le tracé doit raconter la même histoire que le pourcentage de la carte.
    expect(up.at(-1)!).toBeGreaterThan(up[0]);
    expect(down.at(-1)!).toBeLessThan(down[0]);
  });

  it("est déterministe — même ticker, même série", () => {
    expect(generateSparkline("AAPL", 268.01, 0.82)).toEqual(
      generateSparkline("AAPL", 268.01, 0.82)
    );
  });

  it("diffère d'un ticker à l'autre", () => {
    const a = generateSparkline("AAPL", 100, 1);
    const b = generateSparkline("MSFT", 100, 1);
    expect(a).not.toEqual(b);
  });

  it("ne produit jamais de valeur négative ou non finie", () => {
    for (const change of [-99, -50, 0, 50, 200]) {
      for (const v of generateSparkline("TEST", 10, change)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it("renvoie une série vide sur une entrée aberrante", () => {
    expect(generateSparkline("X", 0, 1)).toEqual([]);
    expect(generateSparkline("X", Number.NaN, 1)).toEqual([]);
    expect(generateSparkline("X", -5, 1)).toEqual([]);
  });

  it("ne rend pas une ligne parfaitement plate à variation nulle", () => {
    const flat = generateSparkline("AAPL", 100, 0);
    expect(new Set(flat).size).toBeGreaterThan(1);
  });
});

describe("resample", () => {
  it("conserve une série plus courte que la cible", () => {
    expect(resample([1, 2, 3], 78)).toEqual([1, 2, 3]);
  });

  it("réduit une série trop longue en gardant les extrémités", () => {
    const long = Array.from({ length: 390 }, (_, i) => i + 1);
    const out = resample(long, 78);
    expect(out).toHaveLength(78);
    expect(out[0]).toBe(1);
    expect(out.at(-1)).toBe(390);
  });

  it("écarte les valeurs nulles ou non finies renvoyées par Yahoo", () => {
    expect(resample([10, Number.NaN, 0, 12], 78)).toEqual([10, 12]);
  });
});

describe("withSparklines", () => {
  it("complète les actions dépourvues de série", () => {
    const [s] = withSparklines([{ ticker: "AAPL", price: 100, change: 1 }]);
    expect(s.sparkline).toHaveLength(SPARKLINE_POINTS);
  });

  it("respecte une série déjà présente", () => {
    const existing = [1, 2, 3];
    const [s] = withSparklines([
      { ticker: "AAPL", price: 100, change: 1, sparkline: existing },
    ]);
    expect(s.sparkline).toBe(existing);
  });
});
