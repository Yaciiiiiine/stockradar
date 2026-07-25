import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logConsole: vi.fn(),
  writeAlert: vi.fn(),
  appendRun: vi.fn(),
}));

const { missingEnv, guardCronEnv, REQUIRED_CRON_ENV } = await import(
  "@/lib/env-guard"
);
const { writeAlert } = await import("@/lib/logger");

/** Positionne toutes les variables requises, puis retire celles demandées. */
function setEnv(...omit: string[]) {
  for (const name of REQUIRED_CRON_ENV) {
    if (omit.includes(name)) vi.stubEnv(name, "");
    else vi.stubEnv(name, `valeur-${name}`);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("missingEnv", () => {
  it("ne rapporte rien quand tout est renseigné", () => {
    setEnv();
    expect(missingEnv()).toEqual([]);
  });

  it("rapporte les variables absentes", () => {
    setEnv("RESEND_API_KEY", "STOCK_API_KEY");
    expect(missingEnv().sort()).toEqual(["RESEND_API_KEY", "STOCK_API_KEY"]);
  });

  it("traite une chaîne vide ou blanche comme absente", () => {
    setEnv();
    vi.stubEnv("RESEND_API_KEY", "   ");
    expect(missingEnv()).toEqual(["RESEND_API_KEY"]);
  });
});

describe("guardCronEnv en production", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  it("laisse passer quand la configuration est complète", () => {
    setEnv();
    vi.stubEnv("NODE_ENV", "production");
    expect(guardCronEnv("morning-brief")).toBeNull();
    expect(writeAlert).not.toHaveBeenCalled();
  });

  it("renvoie un 500 et alerte quand RESEND_API_KEY manque", async () => {
    setEnv("RESEND_API_KEY");
    vi.stubEnv("NODE_ENV", "production");

    const response = guardCronEnv("morning-brief");

    expect(response).not.toBeNull();
    expect(response!.status).toBe(500);

    const body = await response!.json();
    expect(body.error).toBe("Configuration incomplète");
    expect(body.missing).toEqual(["RESEND_API_KEY"]);
    expect(body.job).toBe("morning-brief");

    expect(writeAlert).toHaveBeenCalledWith(
      "CONFIG_MISSING",
      expect.stringContaining("RESEND_API_KEY")
    );
  });
});

describe("guardCronEnv hors production", () => {
  it("tolère l'absence pour permettre les essais en local", () => {
    setEnv("RESEND_API_KEY");
    vi.stubEnv("NODE_ENV", "development");

    expect(guardCronEnv("morning-brief")).toBeNull();
    // Toléré, mais jamais silencieux.
    expect(writeAlert).not.toHaveBeenCalled();
  });
});
