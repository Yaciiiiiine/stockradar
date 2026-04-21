import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StockRadar — Les 10 actions FR et US à surveiller. Chaque jour.",
  description:
    "Briefing boursier quotidien : 10 actions françaises et 10 actions américaines à surveiller, avec les raisons et catalyseurs. Compte-rendu du soir inclus.",
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
