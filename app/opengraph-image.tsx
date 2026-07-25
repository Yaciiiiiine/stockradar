import { ImageResponse } from "next/og";
import { ALL_TICKERS } from "@/lib/sources/tickers";

export const alt =
  "StockRadar — les actions françaises et américaines à surveiller chaque jour";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// L'image affiche la date du jour : sans ça elle serait figée à la date du
// build. Une heure de cache suffit largement pour une donnée qui change une
// fois par jour, et évite de la régénérer à chaque passage de crawler.
export const revalidate = 3600;

export default async function OpengraphImage() {
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const frCount = ALL_TICKERS.filter((t) => t.market === "FR").length;
  const usCount = ALL_TICKERS.filter((t) => t.market === "US").length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "#f5f5f7",
              letterSpacing: -1,
            }}
          >
            StockRadar
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#86868b",
              border: "1px solid #3a3a3e",
              borderRadius: 8,
              padding: "4px 12px",
            }}
          >
            Beta
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#f5f5f7",
              letterSpacing: -3,
              lineHeight: 1.05,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>{`Les ${ALL_TICKERS.length} actions FR et US`}</span>
            <span>{"à surveiller. Chaque jour."}</span>
          </div>
          <div style={{ fontSize: 30, color: "#86868b", marginTop: 28 }}>
            {date}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            borderTop: "1px solid #2a2a2e",
            paddingTop: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: "#f5f5f7" }}>
              {frCount}
            </span>
            <span style={{ fontSize: 22, color: "#86868b", marginTop: 4 }}>
              actions françaises
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: "#f5f5f7" }}>
              {usCount}
            </span>
            <span style={{ fontSize: 22, color: "#86868b", marginTop: 4 }}>
              actions américaines
            </span>
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 20,
              color: "#48484a",
              display: "flex",
            }}
          >
            Briefing matin et soir
          </div>
        </div>
      </div>
    ),
    size
  );
}
