import { describe, it, expect } from "vitest";
import { normalizeName, matchAgentName } from "./agents";

describe("normalizeName", () => {
  it("lowercases, strips accents, and removes non-letters", () => {
    expect(normalizeName("Bruno Oliveira")).toBe("brunooliveira");
    expect(normalizeName("André")).toBe("andre");
    expect(normalizeName("Maria-Luiza 2")).toBe("marialuiza");
  });
});

describe("matchAgentName", () => {
  it("matches via substring in either direction", () => {
    expect(matchAgentName("Bruno", "Bruno Oliveira")).toBe(true);
    expect(matchAgentName("Bruno Oliveira", "Bruno")).toBe(true);
    expect(matchAgentName("Bruno", "Wagner")).toBe(false);
  });

  it("applies the documented special-cased aliases", () => {
    expect(matchAgentName("Andreia", "Andrea Souza")).toBe(true);
    expect(matchAgentName("Marlon SA", "Marlon Santos")).toBe(true);
    expect(matchAgentName("Malu", "Maria Luiza")).toBe(true);
    expect(matchAgentName("Malu", "Malu Costa")).toBe(true);
  });

  it("is accent- and case-insensitive", () => {
    expect(matchAgentName("JÚLIO", "julio cesar")).toBe(true);
  });
});
