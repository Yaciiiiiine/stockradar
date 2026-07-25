import { describe, it, expect } from "vitest";
import {
  generateUnsubscribeToken,
  isValidUnsubscribeToken,
  isLegacyUnsubscribeToken,
  buildUnsubscribeUrl,
  extractUnsubscribeToken,
} from "@/lib/unsubscribe";

describe("jeton de désinscription — génération", () => {
  it("produit 64 caractères hexadécimaux (256 bits)", () => {
    const token = generateUnsubscribeToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ne produit jamais deux fois le même jeton", () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => generateUnsubscribeToken())
    );
    expect(tokens.size).toBe(500);
  });

  it("génère un jeton que le validateur accepte", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidUnsubscribeToken(generateUnsubscribeToken())).toBe(true);
    }
  });
});

describe("jeton de désinscription — validation", () => {
  it("accepte les jetons cuid hérités de l'ancien schéma Prisma", () => {
    const legacy = "clzk3n8p90000356m1a2b3c4d";
    expect(isValidUnsubscribeToken(legacy)).toBe(true);
    expect(isLegacyUnsubscribeToken(legacy)).toBe(true);
    expect(isLegacyUnsubscribeToken(generateUnsubscribeToken())).toBe(false);
  });

  it.each([
    ["chaîne vide", ""],
    ["trop court", "abc123"],
    ["hex tronqué", "a".repeat(63)],
    ["hex trop long", "a".repeat(65)],
    ["majuscules", "A".repeat(64)],
    ["caractère hors hex", `${"a".repeat(63)}z`],
    ["injection SQL", "' OR 1=1 --"],
    ["chemin", "../../etc/passwd"],
  ])("rejette %s", (_label, value) => {
    expect(isValidUnsubscribeToken(value)).toBe(false);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["nombre", 12345],
    ["objet", {}],
    ["tableau", []],
  ])("rejette une valeur de type %s", (_label, value) => {
    expect(isValidUnsubscribeToken(value)).toBe(false);
  });
});

describe("jeton de désinscription — lien", () => {
  it("construit un lien absolu contenant le jeton", () => {
    const token = generateUnsubscribeToken();
    const url = buildUnsubscribeUrl(token, "https://stockradar.test");
    expect(url).toBe(
      `https://stockradar.test/api/unsubscribe?token=${token}`
    );
  });

  it("ne double pas le slash quand l'URL de base en a un", () => {
    const url = buildUnsubscribeUrl("abc", "https://stockradar.test/");
    expect(url).toBe("https://stockradar.test/api/unsubscribe?token=abc");
  });

  it("fait un aller-retour génération → lien → extraction → validation", () => {
    const token = generateUnsubscribeToken();
    const url = buildUnsubscribeUrl(token, "https://stockradar.test");
    const extracted = extractUnsubscribeToken(url);

    expect(extracted).toBe(token);
    expect(isValidUnsubscribeToken(extracted)).toBe(true);
  });

  it("renvoie null quand le lien n'a pas de jeton ou n'est pas une URL", () => {
    expect(
      extractUnsubscribeToken("https://stockradar.test/api/unsubscribe")
    ).toBeNull();
    expect(extractUnsubscribeToken("pas-une-url")).toBeNull();
  });
});
