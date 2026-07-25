"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { SPARKLINE_DRAW_MS, useReducedMotion } from "@/lib/motion";

export const SPARKLINE_HEIGHT = 40;

const UP = "#34c759";
const DOWN = "#ff3b30";

interface SparklineChartProps {
  values: number[];
  /** Variation du jour : décide de la couleur du tracé. */
  change: number;
  /** Décrit le tracé aux lecteurs d'écran. */
  label: string;
}

/**
 * Sparkline intraday.
 *
 * Ni axes, ni grille, ni interaction : le graphe ne sert qu'à donner la forme
 * de la séance. Le chiffre exact reste porté par le prix et le pourcentage
 * juste à côté. Le canvas seul étant muet pour un lecteur d'écran, le
 * conteneur porte role="img" et un libellé qui résume le tracé.
 */
export default function SparklineChart({ values, change, label }: SparklineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || values.length < 2) return;

    const color = change >= 0 ? UP : DOWN;

    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: SPARKLINE_HEIGHT,
      layout: {
        background: { color: "transparent" },
        textColor: "transparent",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
    });

    const series: ISeriesApi<"Line"> = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // Les timestamps ne sont jamais affichés : un pas régulier suffit à ordonner
    // les points, et évite de dépendre du fuseau du marché.
    const points: LineData<UTCTimestamp>[] = values.map((value, i) => ({
      time: (i * 300) as UTCTimestamp,
      value,
    }));

    let frame = 0;
    let cancelled = false;

    if (reduced) {
      // Préférence sobre : le tracé complet, tout de suite.
      series.setData(points);
      chart.timeScale().fitContent();
    } else {
      // Tracé progressif : on révèle les points au fil du temps. L'échelle est
      // figée sur la série complète dès le départ, sinon le graphe se
      // recadrerait à chaque frame et le tracé semblerait onduler.
      const min = Math.min(...values);
      const max = Math.max(...values);
      const pad = (max - min) * 0.1 || max * 0.01;
      series.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: min - pad, maxValue: max + pad },
        }),
      });
      chart.timeScale().setVisibleLogicalRange({
        from: 0,
        to: points.length - 1,
      });

      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const t = Math.min((now - start) / SPARKLINE_DRAW_MS, 1);
        // Même courbe que TRANSITION : sortie franche, arrivée douce.
        const eased = 1 - (1 - t) ** 3;
        const count = Math.max(2, Math.round(eased * points.length));
        series.setData(points.slice(0, count));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }

    const resize = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    resize.observe(container);

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      chart.remove();
    };
  }, [values, change, reduced]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      style={{ height: SPARKLINE_HEIGHT }}
      className="w-full"
    />
  );
}
