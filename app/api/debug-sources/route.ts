import { readLastRun, readRecentAlerts } from "@/lib/logger";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastRun      = readLastRun();
  const recentAlerts = readRecentAlerts(10);

  return Response.json({
    last_run:       lastRun?.timestamp ?? null,
    run_id:         lastRun?.run_id    ?? null,
    summary:        lastRun?.summary   ?? null,
    recent_alerts:  recentAlerts,
  });
}
