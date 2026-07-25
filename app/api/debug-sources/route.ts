import { readLastRun, readRecentAlerts } from "@/lib/logger";
import { isAuthorized, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const lastRun      = readLastRun();
  const recentAlerts = readRecentAlerts(10);

  return Response.json({
    last_run:       lastRun?.timestamp ?? null,
    run_id:         lastRun?.run_id    ?? null,
    summary:        lastRun?.summary   ?? null,
    recent_alerts:  recentAlerts,
  });
}
