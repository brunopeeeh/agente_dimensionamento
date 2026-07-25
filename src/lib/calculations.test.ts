import { describe, it, expect } from "vitest";
import { computeGridCalculations, computeDynamicTmaFactors } from "./calculations";
import type { Day, TeamAgent, CapacityAgent } from "@/context/types";

function agent(id: string, time20: string, day: Day): TeamAgent {
  return {
    id,
    name: `Agente ${id}`,
    active: true,
    schedules: { [day]: { intervals: { [time20]: "trabalhando" } } },
  };
}

describe("computeGridCalculations", () => {
  it("does not free webchat agents to whatsapp when webchat itself is short", () => {
    const days: Day[] = ["Segunda"];
    const result = computeGridCalculations({
      days,
      timeBlocks: ["10:00"],
      webchatVolumes: { "10:00": { Segunda: 5 } as Record<Day, number> },
      whatsappVolumes: { "10:00": { Segunda: 3 } as Record<Day, number> },
      teamAgents: [agent("a1", "10:00", "Segunda")],
      dynamicTmaFactors: { Segunda: 2 } as Record<Day, number>,
      simultaneousWC: 3,
      simultaneousWA: 4,
      newHires: [],
    });

    const row = result.rowCalculations[0];
    expect(row.capacityR[0]).toBe(2); // 1 agent * factor 2
    expect(row.resultado[0]).toBe(-3); // webchat deficit, no surplus to lend
    expect(row.agentsWhats[0]).toBe(0);
    expect(row.waCapacityR[0]).toBe(0);
    expect(row.waFaltam10[0]).toBe(1); // ceil(3 / simultaneousWA=4)

    expect(result.kpis.totalDeficit10).toBe(1);
    expect(result.kpis.coberturaProjetada).toBe(0);
  });

  it("cascades webchat surplus into freed agents that cover whatsapp demand", () => {
    const days: Day[] = ["Segunda"];
    const agents = [
      agent("a1", "10:00", "Segunda"),
      agent("a2", "10:00", "Segunda"),
      agent("a3", "10:00", "Segunda"),
    ];

    const result = computeGridCalculations({
      days,
      timeBlocks: ["10:00"],
      webchatVolumes: { "10:00": { Segunda: 2 } as Record<Day, number> },
      whatsappVolumes: { "10:00": { Segunda: 2 } as Record<Day, number> },
      teamAgents: agents,
      dynamicTmaFactors: { Segunda: 3 } as Record<Day, number>,
      simultaneousWC: 3,
      simultaneousWA: 4,
      newHires: [],
    });

    const row = result.rowCalculations[0];
    // capacity = 3 agents * 3 = 9, volume 2 -> surplus 7 chats -> floor(7/3) = 2 agents freed
    expect(row.capacityR[0]).toBe(9);
    expect(row.resultado[0]).toBe(7);
    expect(row.agentsWhats[0]).toBe(2);
    // whatsapp capacity = 2 freed agents * factorWA(3 * 4/3 = 4) = 8, volume 2 -> surplus 6 (waFaltam10 = -2)
    expect(row.waCapacityR[0]).toBe(8);
    expect(row.waFaltam10[0]).toBe(-2);
    expect(result.kpis.coberturaProjetada).toBe(100);
  });

  it("prova real: simulated new hires reduce the projected whatsapp deficit without touching the raw deficit", () => {
    const days: Day[] = ["Segunda"];
    const webchatVolumes = { "10:00": { Segunda: 0 } as Record<Day, number> };
    const whatsappVolumes = { "10:00": { Segunda: 3 } as Record<Day, number> };
    const shared = {
      days,
      timeBlocks: ["10:00"],
      webchatVolumes,
      whatsappVolumes,
      teamAgents: [] as TeamAgent[],
      dynamicTmaFactors: { Segunda: 3 } as Record<Day, number>,
      simultaneousWC: 3,
      simultaneousWA: 4,
    };

    const baseline = computeGridCalculations({ ...shared, newHires: [] });
    expect(baseline.rowCalculations[0].waFaltam10[0]).toBe(1); // ceil(3 / 4)

    const withHire = computeGridCalculations({
      ...shared,
      newHires: [
        {
          id: "h1",
          name: "Novo Agente",
          start_time: "09:00",
          end_time: "18:00",
          days: ["Segunda"],
          active: true,
        },
      ],
    });

    // The simulated hire covers the 10:00 block -> prova real deficit drops to -1 surplus.
    expect(withHire.rowCalculations[0].prFaltam10[0]).toBe(-1);
    expect(withHire.kpis.provaRealDeficit10).toBe(0);
    // The raw (non-simulated) deficit is unaffected by the hire.
    expect(withHire.rowCalculations[0].waFaltam10[0]).toBe(1);
  });
});

describe("computeDynamicTmaFactors", () => {
  it("blends scheduled agent capacity with the Yooga Suporte and Care AI baseline", () => {
    const days: Day[] = ["Segunda", "Terça"];
    const teamAgents: TeamAgent[] = [
      {
        id: "a1",
        name: "Agente A",
        active: true,
        schedules: { Segunda: { intervals: { "10:00": "trabalhando" } } },
      },
    ];
    const capacityAgents: CapacityAgent[] = [
      { name: "Agente A", mediaTri: 2880 }, // -> 1 resolvido/10min
      { name: "Yooga Suporte", mediaTri: 1440 }, // -> 0.5 resolvido/10min
      { name: "Care AI", mediaTri: 5760 }, // -> 2 resolvidos/10min
    ];

    const factors = computeDynamicTmaFactors(days, teamAgents, capacityAgents);

    // Segunda: 1 human scheduled -> (1 + 0.5 + 2) / (1 + 1) = 1.75
    expect(factors.Segunda).toBe(1.75);
    // Terça: nobody scheduled -> (0 + 0.5 + 2) / (0 + 1) = 2.5
    expect(factors["Terça"]).toBe(2.5);
  });
});
