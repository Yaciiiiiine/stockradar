export interface TickerDef {
  symbol: string;
  name: string;
  market: "FR" | "US";
}

export const FR_TICKERS: TickerDef[] = [
  { symbol: "MC.PA",  name: "LVMH Moët Hennessy",   market: "FR" },
  { symbol: "TTE.PA", name: "TotalEnergies",          market: "FR" },
  { symbol: "SAN.PA", name: "Sanofi",                 market: "FR" },
  { symbol: "SU.PA",  name: "Schneider Electric",     market: "FR" },
  { symbol: "AIR.PA", name: "Airbus",                 market: "FR" },
  { symbol: "BNP.PA", name: "BNP Paribas",            market: "FR" },
  { symbol: "RMS.PA", name: "Hermès International",   market: "FR" },
  { symbol: "OR.PA",  name: "L'Oréal",                market: "FR" },
  { symbol: "DSY.PA", name: "Dassault Systèmes",      market: "FR" },
  { symbol: "HO.PA",  name: "Thales",                 market: "FR" },
];

export const US_TICKERS: TickerDef[] = [
  { symbol: "AAPL",  name: "Apple Inc.",              market: "US" },
  { symbol: "MSFT",  name: "Microsoft Corporation",   market: "US" },
  { symbol: "NVDA",  name: "NVIDIA Corporation",      market: "US" },
  { symbol: "TSLA",  name: "Tesla, Inc.",              market: "US" },
  { symbol: "META",  name: "Meta Platforms, Inc.",    market: "US" },
  { symbol: "GOOGL", name: "Alphabet Inc.",            market: "US" },
  { symbol: "AMZN",  name: "Amazon.com, Inc.",         market: "US" },
  { symbol: "AMD",   name: "Advanced Micro Devices",  market: "US" },
  { symbol: "PLTR",  name: "Palantir Technologies",   market: "US" },
  { symbol: "NFLX",  name: "Netflix, Inc.",            market: "US" },
];

export const ALL_TICKERS: TickerDef[] = [...FR_TICKERS, ...US_TICKERS];
