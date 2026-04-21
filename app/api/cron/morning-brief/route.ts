import { prisma } from "@/lib/prisma";
import { getMorningStocks } from "@/lib/stocks";
import { sendMorningBrief } from "@/lib/email";
import { format } from "date-fns";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  try {
    const existing = await prisma.dailyBrief.findUnique({
      where: { date_type: { date: today, type: "morning" } },
    });
    if (existing) {
      return Response.json({ message: "Brief already exists for today", date: today });
    }

    const { fr, us } = await getMorningStocks();
    const allStocks = [...fr, ...us];

    const brief = await prisma.dailyBrief.create({
      data: {
        date: today,
        type: "morning",
        stocks: {
          create: allStocks.map((s) => ({
            ticker: s.ticker,
            name: s.name,
            market: s.market,
            price: s.price,
            change: s.change,
            reason: s.reason,
            preMarket: s.preMarket ?? null,
            volume: s.volume ?? null,
          })),
        },
      },
    });

    const subscribers = await prisma.subscriber.findMany({
      where: { verified: true },
    });

    if (subscribers.length > 0) {
      const tokens = new Map(subscribers.map((s) => [s.email, s.token]));
      const emails = subscribers.map((s) => s.email);
      const dateLabel = format(new Date(), "d MMMM yyyy");
      await sendMorningBrief(emails, tokens, dateLabel, fr, us);
    }

    return Response.json({
      success: true,
      date: today,
      briefId: brief.id,
      stocksCount: allStocks.length,
      emailsSent: subscribers.length,
    });
  } catch (err) {
    console.error("Morning brief error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
