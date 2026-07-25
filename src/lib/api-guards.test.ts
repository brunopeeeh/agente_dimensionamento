import { describe, it, expect, afterEach } from "vitest";
import process from "node:process";
import { isCrossSite, hasValidApiKey } from "./api-guards";

const URL_API = new URL("https://app.exemplo.com/api/sync-capacity");

function req(headers: Record<string, string> = {}): Request {
  return new Request(URL_API.toString(), { method: "POST", headers });
}

afterEach(() => {
  delete process.env.API_SHARED_SECRET;
  delete process.env.APP_ORIGIN;
});

describe("isCrossSite", () => {
  it("permite requisição sem Origin (n8n, curl)", () => {
    expect(isCrossSite(req(), URL_API)).toBe(false);
  });

  it("permite a própria origem (UI chamando por URL relativa)", () => {
    expect(isCrossSite(req({ origin: "https://app.exemplo.com" }), URL_API)).toBe(false);
  });

  it("bloqueia site de terceiro", () => {
    expect(isCrossSite(req({ origin: "https://atacante.com" }), URL_API)).toBe(true);
  });

  it("permite origem extra declarada em APP_ORIGIN", () => {
    process.env.APP_ORIGIN = "https://preview.exemplo.com";
    expect(isCrossSite(req({ origin: "https://preview.exemplo.com" }), URL_API)).toBe(false);
  });
});

describe("hasValidApiKey", () => {
  it("falha fechado quando API_SHARED_SECRET não está no ambiente", () => {
    expect(hasValidApiKey(req({ "x-api-key": "qualquer" }))).toBe(false);
  });

  it("rejeita chave errada", () => {
    process.env.API_SHARED_SECRET = "segredo-teste";
    expect(hasValidApiKey(req({ "x-api-key": "errada" }))).toBe(false);
  });

  it("rejeita requisição sem header", () => {
    process.env.API_SHARED_SECRET = "segredo-teste";
    expect(hasValidApiKey(req())).toBe(false);
  });

  it("aceita chave correta", () => {
    process.env.API_SHARED_SECRET = "segredo-teste";
    expect(hasValidApiKey(req({ "x-api-key": "segredo-teste" }))).toBe(true);
  });
});
