import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const TITLE = "StockRadar — Les 10 actions FR et US à surveiller. Chaque jour.";
const DESCRIPTION =
  "Briefing boursier quotidien : 10 actions françaises et 10 actions américaines à surveiller, avec les raisons et catalyseurs. Compte-rendu du soir inclus.";

export const metadata: Metadata = {
  // Requis pour que opengraph-image.tsx et le sitemap résolvent des URLs
  // absolues — sans ça Next retombe sur http://localhost:3000.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "StockRadar",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="bg-black text-[#f5f5f7] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
