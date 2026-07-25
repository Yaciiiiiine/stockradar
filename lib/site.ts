/** URL publique du site, sans slash final. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://stockradar-five.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "StockRadar";
