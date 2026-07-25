import { prisma } from "@/lib/prisma";
import { getMorningStocks } from "@/lib/stocks";
import { sendMorningBrief, MissingApiKeyError } from "@/lib/email";
import { format } from "date-fns";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { logCronStart } from "@/lib/cron-schedule";
import { guardCronEnv, warnIfCronSecretMissing } from "@/lib/env-guard";
import { writeAlert } from "@/lib/logger";

const JOB = "morning-brief";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    warnIfCronSecretMissing(JOB);
    return unauthorized();
  }

  logCronStart(JOB);

  const configError = guardCronEnv(JOB);
  if (configError) return configError;

  const today = format(new Date(), "yyyy-MM-dd");

  try {
    const existing = await prisma.dailyBrief.findUnique({
      where: { date_type: { date: today, type: "morning" } },
    });
    if (existing) {
      return Response.json({
        success: true,
        skipped: "already_exists",
        message: "Brief already exists for today",
        date: today,
        email: { targeted: 0, sent: 0, failed: 0, errors: [] },
      });
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
            sparkline: s.sparkline ?? [],
          })),
        },
      },
    });

    const subscribers = await prisma.subscriber.findMany({
      where: { verified: true },
    });

    const tokens = new Map(subscribers.map((s) => [s.email, s.token]));
    const emails = subscribers.map((s) => s.email);
    const dateLabel = format(new Date(), "d MMMM yyyy");

    const email = await sendMorningBrief(emails, tokens, dateLabel, fr, us);

    if (email.failed > 0) {
      writeAlert(
        "EMAIL_SEND_FAILED",
        `${JOB} — ${email.failed}/${email.targeted} envois en échec : ${email.errors.join(" | ")}`
      );
    }

    // Le brief est enregistré même si les envois échouent : le site reste à
    // jour, mais le résumé dit la vérité sur les emails.
    return Response.json({
      success: email.failed === 0,
      date: today,
      briefId: brief.id,
      stocksCount: allStocks.length,
      email,
    });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      writeAlert("CONFIG_MISSING", `${JOB} — ${err.message}`);
      return Response.json(
        { error: "Configuration incomplète", job: JOB, missing: [err.variable] },
        { status: 500 }
      );
    }
    console.error("Morning brief error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
