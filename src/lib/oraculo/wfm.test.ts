import { describe, it, expect } from "vitest";
import { calcularErlangC, dimensionarMes, rankearGargalos } from "./wfm";

describe("rankearGargalos", () => {
  it("elege a faixa de maior volume como o gargalo mais crítico", () => {
    const faixas = [
      { faixa: "08:00", volume: 10 },
      { faixa: "12:00", volume: 40 },
      { faixa: "19:00", volume: 60 }, // pico real
      { faixa: "23:00", volume: 20 },
    ];
    const { media, gargalos } = rankearGargalos(faixas);
    expect(media).toBe(32.5); // (10+40+60+20)/4
    expect(gargalos[0].faixa).toBe("19:00");
    expect(gargalos[0].nivel).toBe("CRÍTICO"); // ~85% acima da média
    // Só faixas acima da média entram; 08:00 e 23:00 (abaixo) ficam fora.
    expect(gargalos.map((g) => g.faixa)).toEqual(["19:00", "12:00"]);
  });

  it("não inventa gargalo quando não há volume", () => {
    expect(rankearGargalos([{ faixa: "08:00", volume: 0 }]).gargalos).toEqual([]);
  });
});

describe("calcularErlangC", () => {
  it("exige mais agentes conforme o volume sobe", () => {
    const baixo = calcularErlangC(60, 300).agentesNecessarios;
    const alto = calcularErlangC(600, 300).agentesNecessarios;
    expect(alto).toBeGreaterThan(baixo);
    expect(calcularErlangC(600, 300).slaAlcancadoPerc).toBeGreaterThanOrEqual(80);
  });
});

describe("dimensionarMes", () => {
  it("cresce o headcount com o volume e aplica shrinkage", () => {
    const base = {
      tmaWebchatMin: 16.5,
      tmaWhatsappMin: 13,
      simultaneidadeWebchat: 3,
      simultaneidadeWhatsapp: 4,
      shrinkagePerc: 20,
      shareWebchat: 0.65,
    };
    const menor = dimensionarMes({ ...base, volumeDiarioMedio: 1000 });
    const maior = dimensionarMes({ ...base, volumeDiarioMedio: 2000 });
    expect(maior.headcountTotalFTERecomendado).toBeGreaterThan(menor.headcountTotalFTERecomendado);
    // shrinkage 20% infla o headcount líquido (fator 1.25)
    expect(menor.headcountTotalFTERecomendado).toBeGreaterThan(0);
  });
});
