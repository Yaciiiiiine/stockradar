import { describe, it, expect } from "vitest";
import { renderMorningBrief } from "@/lib/email";
import { AMF_DISCLAIMER } from "@/lib/legal";
import type { StockData } from "@/lib/mock-data";

// Jeu de données figé : le snapshot ne doit bouger que si le template bouge.
const FR: StockData[] = [
  {
    ticker: "MC",
    name: "LVMH Moët Hennessy",
    market: "FR",
    price: 687.4,
    change: 2.34,
    reason: "Résultats trimestriels au-dessus du consensus.",
  },
  {
    ticker: "TTE",
    name: "TotalEnergies",
    market: "FR",
    price: 58.12,
    change: -1.07,
    reason: "Recul du Brent sur fond de tensions OPEP+.",
  },
];

const US: StockData[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    market: "US",
    price: 268.01,
    change: 0.82,
    reason: "Anticipation du prochain cycle iPhone.",
  },
];

const TOKEN = "a".repeat(64);
const DATE = "25 juillet 2026";

describe("template email — briefing matinal", () => {
  it("correspond au snapshot", () => {
    expect(renderMorningBrief(DATE, FR, US, TOKEN)).toMatchSnapshot();
  });

  it("porte le lien de désinscription du destinataire", () => {
    const html = renderMorningBrief(DATE, FR, US, TOKEN);
    expect(html).toContain(`https://stockradar.test/api/unsubscribe?token=${TOKEN}`);
  });

  it("porte les liens légaux et l'avertissement AMF", () => {
    const html = renderMorningBrief(DATE, FR, US, TOKEN);
    expect(html).toContain("https://stockradar.test/mentions-legales");
    expect(html).toContain("https://stockradar.test/confidentialite");
    expect(html).toContain(AMF_DISCLAIMER);
  });

  it("affiche hausses et baisses avec la bonne couleur et le bon signe", () => {
    const html = renderMorningBrief(DATE, FR, US, TOKEN);
    // Vert + signe explicite pour une hausse, rouge sans signe pour une baisse.
    expect(html).toContain("#34c759");
    expect(html).toContain("+2.34%");
    expect(html).toContain("#ff3b30");
    expect(html).toContain("-1.07%");
  });

  it("utilise le symbole monétaire du marché de chaque ligne", () => {
    const html = renderMorningBrief(DATE, FR, US, TOKEN);
    expect(html).toContain("€687.40");
    expect(html).toContain("$268.01");
  });
});
