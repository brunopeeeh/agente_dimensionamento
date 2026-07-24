import { describe, it, expect } from "vitest";
import { applyVolumeSpike, applyAbsence, type VolumeMap } from "./simulador";
import { computeGridCalculations } from "./calculations";
import type { Day, TeamAgent } from "@/context/types";

function volumes(): VolumeMap {
  return {
    "10:00": { Segunda: 10, Terça: 20 } as Record<Day, number>,
    "10:10": { Segunda: 5, Terça: 7 } as Record<Day, number>,
  };
}

function agent(id: string, overrides: Partial<TeamAgent> = {}): TeamAgent {
  return {
    id,
    name: `Agente ${id}`,
    active: true,
    schedules: {
      Segunda: { intervals: { "10:00": "trabalhando", "10:20": "pausa" } },
      Terça: { intervals: { "10:00": "trabalhando" } },
    },
    ...overrides,
  };
}

describe("applyVolumeSpike", () => {
  it("multiplica só as colunas dos dias selecionados", () => {
    const result = applyVolumeSpike(volumes(), ["Segunda"], 50);

    expect(result["10:00"].Segunda).toBe(15); // 10 * 1.5
    expect(result["10:10"].Segunda).toBe(7.5); // 5 * 1.5
    expect(result["10:00"].Terça).toBe(20); // intocado
    expect(result["10:10"].Terça).toBe(7);
  });

  it("preserva volumes fracionários pequenos (não arredonda)", () => {
    // Os volumes reais são médias por bloco de 10min e costumam ser < 1.
    // Arredondar zeraria esses blocos e o "pico" reduziria o volume total.
    const fractional: VolumeMap = {
      "10:00": { Segunda: 0.31 } as Record<Day, number>,
    };
    const result = applyVolumeSpike(fractional, ["Segunda"], 30);

    expect(result["10:00"].Segunda).toBeCloseTo(0.403, 5);
    expect(result["10:00"].Segunda).toBeGreaterThan(fractional["10:00"].Segunda);
  });

  it("é no-op com pct 0 ou sem dias", () => {
    const original = volumes();
    expect(applyVolumeSpike(original, ["Segunda"], 0)).toBe(original);
    expect(applyVolumeSpike(original, [], 30)).toBe(original);
  });

  it("não muta o mapa original", () => {
    const original = volumes();
    applyVolumeSpike(original, ["Segunda", "Terça"], 100);

    expect(original["10:00"].Segunda).toBe(10);
    expect(original["10:00"].Terça).toBe(20);
  });

  it("aceita queda de volume com pct negativo", () => {
    const result = applyVolumeSpike(volumes(), ["Terça"], -50);
    expect(result["10:00"].Terça).toBe(10);
  });
});

describe("applyAbsence", () => {
  it("desativa o agente quando a ausência é a semana toda", () => {
    const result = applyAbsence([agent("a1"), agent("a2")], new Set(["a1"]), []);

    expect(result[0].active).toBe(false);
    expect(result[1].active).toBe(true);
  });

  it("zera só os dias marcados quando a ausência é parcial", () => {
    const result = applyAbsence([agent("a1")], new Set(["a1"]), ["Segunda"]);

    expect(result[0].active).toBe(true); // segue no time
    expect(result[0].schedules.Segunda!.intervals["10:00"]).toBe("folga");
    expect(result[0].schedules.Segunda!.intervals["10:20"]).toBe("folga");
    expect(result[0].schedules.Terça!.intervals["10:00"]).toBe("trabalhando");
  });

  it("não muta a escala original", () => {
    const original = [agent("a1")];
    applyAbsence(original, new Set(["a1"]), ["Segunda"]);

    expect(original[0].active).toBe(true);
    expect(original[0].schedules.Segunda!.intervals["10:00"]).toBe("trabalhando");
  });

  it("é no-op sem ausentes", () => {
    const original = [agent("a1")];
    expect(applyAbsence(original, new Set(), ["Segunda"])).toBe(original);
  });
});

/**
 * Garante que as perturbações movem os KPIs na direção operacionalmente
 * correta quando passam pela engine — é isso que a coordenadora lê na tela.
 */
describe("integração com computeGridCalculations", () => {
  const days: Day[] = ["Segunda"];
  const timeBlocks = ["10:00"];

  function run(vols: VolumeMap, agents: TeamAgent[]) {
    return computeGridCalculations({
      days,
      timeBlocks,
      webchatVolumes: { "10:00": { Segunda: 2 } as Record<Day, number> },
      whatsappVolumes: vols,
      teamAgents: agents,
      dynamicTmaFactors: { Segunda: 6 } as Record<Day, number>,
      simultaneousWC: 3,
      simultaneousWA: 4,
      newHires: [],
    });
  }

  const team = [agent("a1"), agent("a2")];
  const waVolumes = { "10:00": { Segunda: 20 } as Record<Day, number> };

  it("pico de chamados aumenta o déficit", () => {
    const base = run(waVolumes, team);
    const spiked = run(applyVolumeSpike(waVolumes, ["Segunda"], 30), team);

    expect(spiked.kpis.totalDeficit10).toBeGreaterThan(base.kpis.totalDeficit10);
    expect(spiked.kpis.coberturaProjetada).toBeLessThan(base.kpis.coberturaProjetada);
  });

  it("ausência de analista aumenta o déficit", () => {
    const base = run(waVolumes, team);
    const short = run(waVolumes, applyAbsence(team, new Set(["a1"]), []));

    expect(short.kpis.totalDeficit10).toBeGreaterThan(base.kpis.totalDeficit10);
  });
});
