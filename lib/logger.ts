import fs from "fs";
import path from "path";
import { RunLog } from "./sources/types";

// ---------------------------------------------------------------------------
// Chemins des fichiers de log
// ---------------------------------------------------------------------------

const LOGS_DIR = path.join(process.cwd(), "logs");
const HISTORY_FILE = path.join(LOGS_DIR, "fetch-history.json");
const ALERTS_FILE = path.join(LOGS_DIR, "alerts.log");
const MAX_RUNS = 90;

function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Niveau 1 — Console avec préfixes colorés
// ---------------------------------------------------------------------------

// Codes ANSI pour les terminaux qui les supportent
const C = {
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
  reset:  "\x1b[0m",
};

export type LogEvent =
  | { type: "fetch_start"; message: string }
  | { type: "ok";    symbol: string; source: string; price: number; latency_ms?: number }
  | { type: "fail";  symbol: string; source: string; error: string }
  | { type: "skip";  symbol: string; source: string; reason: string }
  | { type: "comp";  symbol: string; delta_pct: number; alert: boolean }
  | { type: "alert"; alertType: string; message: string };

export function logConsole(event: LogEvent): void {
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  switch (event.type) {
    case "fetch_start":
      console.log(`${C.cyan}[FETCH]${C.reset} ${C.gray}${ts}${C.reset} ${event.message}`);
      break;
    case "ok":
      console.log(
        `${C.green}[OK]   ${C.reset} ${C.gray}${ts}${C.reset} ` +
        `${event.symbol.padEnd(8)} → ${event.source.padEnd(7)} ` +
        `$${event.price.toFixed(2)}` +
        (event.latency_ms ? `  (${event.latency_ms}ms)` : "")
      );
      break;
    case "fail":
      console.error(
        `${C.red}[FAIL] ${C.reset} ${C.gray}${ts}${C.reset} ` +
        `${event.symbol.padEnd(8)} ✗ ${event.source}: ${event.error}`
      );
      break;
    case "skip":
      console.log(
        `${C.gray}[SKIP] ${C.reset} ${C.gray}${ts}${C.reset} ` +
        `${event.symbol.padEnd(8)} — ${event.source} skipped (${event.reason})`
      );
      break;
    case "comp": {
      const marker = event.alert
        ? `${C.yellow}[ALERT]${C.reset}`
        : `${C.green}[COMP] ${C.reset}`;
      console.log(
        `${marker} ${C.gray}${ts}${C.reset} ` +
        `${event.symbol.padEnd(8)} delta ${event.delta_pct.toFixed(3)}%` +
        (event.alert ? " ⚠" : " OK")
      );
      break;
    }
    case "alert":
      console.error(
        `${C.yellow}[ALERT]${C.reset} ${C.gray}${ts}${C.reset} ` +
        `[${event.alertType}] ${event.message}`
      );
      break;
  }
}

// ---------------------------------------------------------------------------
// Niveau 2 — fetch-history.json avec rotation (max 90 runs)
// ---------------------------------------------------------------------------

interface HistoryFile {
  runs: RunLog[];
}

/**
 * Ajoute un run au fichier JSON en rotation.
 * Non-bloquant : les erreurs d'I/O sont loggées en console mais ne plantent pas.
 */
export function appendRun(run: RunLog): void {
  // On lance l'écriture sans await pour ne pas bloquer le pipeline
  writeRunAsync(run).catch((err) =>
    console.error("[logger] appendRun failed (non-fatal):", err)
  );
}

async function writeRunAsync(run: RunLog): Promise<void> {
  try {
    ensureLogsDir();

    let history: HistoryFile = { runs: [] };

    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
      history = JSON.parse(raw) as HistoryFile;
    }

    history.runs.push(run);

    // Rotation : on garde les MAX_RUNS derniers
    if (history.runs.length > MAX_RUNS) {
      history.runs = history.runs.slice(-MAX_RUNS);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch (err) {
    console.error("[logger] writeRunAsync error:", err);
  }
}

// ---------------------------------------------------------------------------
// Niveau 3 — alerts.log (append, format texte, grep-friendly)
// ---------------------------------------------------------------------------

/**
 * Écrit une ligne dans alerts.log.
 * Non-bloquant, silencieux en cas d'erreur d'I/O.
 */
export function writeAlert(alertType: string, message: string): void {
  try {
    ensureLogsDir();
    const line = `${new Date().toISOString()} [${alertType.padEnd(18)}] ${message}\n`;
    fs.appendFileSync(ALERTS_FILE, line, "utf-8");
  } catch (err) {
    console.error("[logger] writeAlert error:", err);
  }
}

// ---------------------------------------------------------------------------
// Lecture pour la route /api/debug-sources
// ---------------------------------------------------------------------------

export function readLastRun(): RunLog | null {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return null;
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    const history = JSON.parse(raw) as HistoryFile;
    return history.runs[history.runs.length - 1] ?? null;
  } catch {
    return null;
  }
}

export function readRecentAlerts(lines = 10): string[] {
  try {
    if (!fs.existsSync(ALERTS_FILE)) return [];
    const content = fs.readFileSync(ALERTS_FILE, "utf-8");
    return content.trim().split("\n").filter(Boolean).slice(-lines);
  } catch {
    return [];
  }
}
