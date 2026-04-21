export interface StockData {
  ticker: string;
  name: string;
  market: "FR" | "US";
  price: number;
  change: number;
  reason: string;
  preMarket?: number;
  volume?: number;
}

export interface BriefData {
  date: string;
  type: "morning" | "evening";
  stocks: StockData[];
  summary?: string;
}

export const MOCK_FR_STOCKS: StockData[] = [
  {
    ticker: "MC",
    name: "LVMH Moët Hennessy",
    market: "FR",
    price: 687.40,
    change: 2.34,
    reason: "Résultats T1 supérieurs aux attentes : croissance organique de +7% portée par la division Mode & Maroquinerie. Les analystes de JPMorgan relèvent leur objectif à 780€.",
  },
  {
    ticker: "TTE",
    name: "TotalEnergies",
    market: "FR",
    price: 58.92,
    change: -1.12,
    reason: "Pression sur le pétrole brut après la décision de l'OPEP+ d'augmenter la production en juin. Le cours du Brent cède 1,8% en séance, pesant sur l'ensemble du secteur.",
  },
  {
    ticker: "SAN",
    name: "Sanofi",
    market: "FR",
    price: 94.75,
    change: 1.87,
    reason: "Données positives de phase III pour dupilumab dans une nouvelle indication pédiatrique. La FDA devrait statuer d'ici la fin du trimestre. Upgrade de Goldman à 'Buy'.",
  },
  {
    ticker: "SU",
    name: "Schneider Electric",
    market: "FR",
    price: 242.10,
    change: 3.21,
    reason: "Forte demande en solutions de gestion d'énergie pour datacenters IA. Contrat majeur signé avec un hyperscaler américain pour l'équipement de 3 nouveaux sites européens.",
  },
  {
    ticker: "AIR",
    name: "Airbus",
    market: "FR",
    price: 168.34,
    change: -0.45,
    reason: "Inquiétudes sur la chaîne d'approvisionnement moteurs CFM. Airbus confirme maintenir son objectif de 800 livraisons en 2026 mais reconnaît des tensions persistantes chez certains fournisseurs.",
  },
  {
    ticker: "BNP",
    name: "BNP Paribas",
    market: "FR",
    price: 71.88,
    change: 1.03,
    reason: "Résultats trimestriels solides : le Produit Net Bancaire progresse de +4,2% grâce à la banque de financement et d'investissement. Rachat d'actions en cours pour 1,05 Md€.",
  },
  {
    ticker: "RMS",
    name: "Hermès International",
    market: "FR",
    price: 2412.00,
    change: 0.78,
    reason: "Chiffre d'affaires T1 en hausse de +9% à taux de change constants. L'Asie-Pacifique rebondit fortement. La liste d'attente pour le Birkin reste un moteur structurel de pricing power.",
  },
  {
    ticker: "OR",
    name: "L'Oréal",
    market: "FR",
    price: 338.55,
    change: -0.62,
    reason: "Légère prise de profit après la publication. Croissance de +5,3% en-dessous des +6,1% anticipés par le consensus. Le segment Luxe déçoit en Chine malgré un rebond des ventes en ligne.",
  },
  {
    ticker: "DSY",
    name: "Dassault Systèmes",
    market: "FR",
    price: 27.84,
    change: 4.15,
    reason: "Accord stratégique avec Airbus pour déployer la plateforme 3DEXPERIENCE sur l'ensemble du programme RISE. Le carnet de commandes progresse de +18% en glissement annuel.",
  },
  {
    ticker: "HO",
    name: "Thales",
    market: "FR",
    price: 218.70,
    change: 2.89,
    reason: "Hausse des budgets de défense européens après le sommet NATO. Thales bénéficie de nouvelles commandes en systèmes de commandement et de renseignement électronique. Objectif relevé à 240€.",
  },
];

export const MOCK_US_STOCKS: StockData[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    market: "US",
    price: 198.52,
    change: 1.23,
    reason: "Anticipations positives avant les résultats du soir. Boom des ventes iPhone en Inde (+34% Q1) et optimisme sur le lancement Apple Intelligence en Europe au Q3.",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    market: "US",
    price: 431.87,
    change: 2.67,
    reason: "Azure Cloud croît de +33% au T3, largement porté par la demande IA. Copilot dépasse 30 millions d'utilisateurs actifs. Analysts de Morgan Stanley haussent leur cible à 490$.",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    market: "US",
    price: 876.40,
    change: -2.14,
    reason: "Prise de profit après un rally de +12% la semaine dernière. Les restrictions d'export vers la Chine créent une incertitude à court terme malgré une demande structurelle en H100/H200 intacte.",
  },
  {
    ticker: "TSLA",
    name: "Tesla, Inc.",
    market: "US",
    price: 247.30,
    change: 5.43,
    reason: "Résultats livraisons Q1 au-dessus des attentes : 386k véhicules vs 370k estimés. L'annonce du Robotaxi version 2.0 pour Austin en juin relance l'enthousiasme des investisseurs.",
  },
  {
    ticker: "META",
    name: "Meta Platforms, Inc.",
    market: "US",
    price: 512.15,
    change: 1.89,
    reason: "Revenu publicitaire en hausse de +16% grâce aux Reels et à l'IA de ciblage. Threads dépasse 200M d'utilisateurs actifs. Investissements IA revus à la hausse pour 2026.",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    market: "US",
    price: 168.74,
    change: -0.87,
    reason: "Procès antitrust en cours sur Google Search : le DOJ cherche à imposer une cession de Chrome. Incertitude juridique pèse sur le titre malgré des fondamentaux publicitaires solides.",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    market: "US",
    price: 193.45,
    change: 0.94,
    reason: "AWS maintient sa croissance à +17%. Prime Day anticipé en juillet avec des volumes records attendus. Lancement d'Alexa+ avec IA générative prévu pour le Q2.",
  },
  {
    ticker: "AMD",
    name: "Advanced Micro Devices",
    market: "US",
    price: 167.23,
    change: 3.78,
    reason: "Mi300X en rupture de stock chez plusieurs cloud providers. AMD gagne des parts de marché sur NVIDIA en inference. UBS initie à 'Buy' avec cible 210$.",
  },
  {
    ticker: "PLTR",
    name: "Palantir Technologies",
    market: "US",
    price: 24.87,
    change: 6.12,
    reason: "Nouveau contrat gouvernemental US pour la plateforme AIP : 480M$ sur 5 ans. Le segment commercial US accélère pour le 3e trimestre consécutif. Volumes anormalement élevés.",
  },
  {
    ticker: "NFLX",
    name: "Netflix, Inc.",
    market: "US",
    price: 634.20,
    change: -1.34,
    reason: "Légère déception sur les abonnements publicité (+4,2M vs 5M attendus). La transition vers le modèle ad-supported progresse mais plus lentement que prévu. La live sports compense partiellement.",
  },
];

export const MOCK_EVENING_SUMMARY = `Les marchés ont affiché une séance mitigée, avec les valeurs technologiques américaines portées par les résultats du secteur cloud tandis que l'énergie recule sur fond de tensions OPEP+. En Europe, la défense et le luxe ont dominé les échanges, reflétant des dynamiques sectorielles divergentes. Le CAC 40 termine en légère hausse de +0,4%, le S&P 500 gagne +0,7% porté par les mégacaps IA.`;

export function getMockMorningBrief(date: string): BriefData {
  return {
    date,
    type: "morning",
    stocks: [...MOCK_FR_STOCKS, ...MOCK_US_STOCKS],
  };
}

export function getMockEveningBrief(date: string): BriefData {
  const eveningStocks = [...MOCK_FR_STOCKS, ...MOCK_US_STOCKS].map((s) => ({
    ...s,
    change: s.change + (Math.random() - 0.5) * 0.5,
    price: s.price * (1 + (Math.random() - 0.5) * 0.01),
  }));
  return {
    date,
    type: "evening",
    stocks: eveningStocks,
    summary: MOCK_EVENING_SUMMARY,
  };
}
