import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { StockData } from "@/lib/mock-data";

const send = vi.fn();

// `getResend` fait un require("resend") paresseux : on remplace le module.
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const { sendMorningBrief, sendEveningRecap, sendConfirmationEmail, MissingApiKeyError } =
  await import("@/lib/email");

const STOCKS: StockData[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    market: "US",
    price: 268.01,
    change: 0.82,
    reason: "Test.",
  },
];

const TOKENS = new Map([
  ["a@exemple.fr", "a".repeat(64)],
  ["b@exemple.fr", "b".repeat(64)],
]);
const EMAILS = ["a@exemple.fr", "b@exemple.fr"];

beforeEach(() => {
  vi.clearAllMocks();
  // Forme réelle d'un succès Resend : { data, error: null }.
  send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("envoi sans RESEND_API_KEY", () => {
  // vitest.config.ts ne définit pas RESEND_API_KEY : elle est absente par défaut.
  it("lève au lieu de retourner silencieusement — briefing matinal", async () => {
    await expect(
      sendMorningBrief(EMAILS, TOKENS, "25 juillet 2026", STOCKS, STOCKS)
    ).rejects.toThrow(MissingApiKeyError);

    expect(send).not.toHaveBeenCalled();
  });

  it("lève au lieu de retourner silencieusement — compte-rendu du soir", async () => {
    await expect(
      sendEveningRecap(EMAILS, TOKENS, "25 juillet 2026", STOCKS, STOCKS, "Résumé.")
    ).rejects.toThrow(MissingApiKeyError);
  });

  it("lève au lieu de retourner silencieusement — email de confirmation", async () => {
    await expect(
      sendConfirmationEmail("a@exemple.fr", "a".repeat(64))
    ).rejects.toThrow(MissingApiKeyError);
  });

  it("nomme la variable fautive dans l'erreur", async () => {
    await expect(
      sendMorningBrief(EMAILS, TOKENS, "25 juillet 2026", STOCKS, STOCKS)
    ).rejects.toMatchObject({ variable: "RESEND_API_KEY" });
  });

  it("ne lève pas s'il n'y a aucun destinataire — 0 abonné n'est pas une panne", async () => {
    const summary = await sendMorningBrief([], new Map(), "25 juillet 2026", STOCKS, STOCKS);
    expect(summary).toEqual({ targeted: 0, sent: 0, failed: 0, errors: [] });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("envoi avec RESEND_API_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
  });

  it("compte les envois réussis", async () => {
    const summary = await sendMorningBrief(
      EMAILS,
      TOKENS,
      "25 juillet 2026",
      STOCKS,
      STOCKS
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ targeted: 2, sent: 2, failed: 0, errors: [] });
  });

  it("compte les échecs sans interrompre le lot", async () => {
    send
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValueOnce({ data: { id: "msg_2" }, error: null });

    const summary = await sendMorningBrief(
      EMAILS,
      TOKENS,
      "25 juillet 2026",
      STOCKS,
      STOCKS
    );

    // Le second destinataire est servi malgré l'échec du premier.
    expect(send).toHaveBeenCalledTimes(2);
    expect(summary.targeted).toBe(2);
    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.errors).toEqual(["rate limited"]);
  });

  it("dédoublonne les messages d'erreur et n'expose aucune adresse", async () => {
    send.mockRejectedValue(new Error("rate limited"));

    const summary = await sendMorningBrief(
      EMAILS,
      TOKENS,
      "25 juillet 2026",
      STOCKS,
      STOCKS
    );

    expect(summary.failed).toBe(2);
    expect(summary.errors).toEqual(["rate limited"]);
    // ARCHITECTURE.md : aucune PII dans les logs ni les compte-rendus.
    for (const email of EMAILS) {
      expect(JSON.stringify(summary)).not.toContain(email);
    }
  });

  it("compte un échec quand Resend résout avec une erreur au lieu de rejeter", async () => {
    // Le SDK ne throw pas : quota dépassé, clé invalide ou domaine non vérifié
    // reviennent dans `error`. C'est ce chemin qui passait pour un succès.
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "The from address is not verified" },
    });

    const summary = await sendMorningBrief(
      EMAILS,
      TOKENS,
      "25 juillet 2026",
      STOCKS,
      STOCKS
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(summary.sent).toBe(0);
    expect(summary.failed).toBe(2);
    expect(summary.errors).toEqual([
      "validation_error: The from address is not verified",
    ]);
  });

  it("fait remonter une erreur Resend sur l'email de confirmation", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: "daily_quota_exceeded", message: "Daily quota exceeded" },
    });

    await expect(
      sendConfirmationEmail("a@exemple.fr", "a".repeat(64))
    ).rejects.toThrow(/daily_quota_exceeded/);
  });

  it("envoie à chaque abonné son propre jeton de désinscription", async () => {
    await sendMorningBrief(EMAILS, TOKENS, "25 juillet 2026", STOCKS, STOCKS);

    const [first, second] = send.mock.calls;
    expect(first[0].to).toBe("a@exemple.fr");
    expect(first[0].html).toContain("a".repeat(64));
    expect(second[0].to).toBe("b@exemple.fr");
    expect(second[0].html).toContain("b".repeat(64));
  });
});
