import { describe, it, expect } from "vitest";
import { runMathSuggestion, estimateAgentsNeeded } from "./solver";
import type { AiSuggestionRequest } from "../api/ai-agent.server";

const VALID_FOLGA_COMBOS = [
  ["sab", "seg"],
  ["sab", "ter"],
  ["dom", "seg"],
  ["dom", "ter"],
];

function buildDeficitTable(): AiSuggestionRequest["deficitTable"] {
  const table: AiSuggestionRequest["deficitTable"] = [];
  for (let h = 7; h < 24; h++) {
    for (let m = 0; m < 60; m += 10) {
      const start = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      const morningPeak = h >= 7 && h < 10 ? 3 : 0;
      const eveningPeak = h >= 18 && h < 21 ? 2 : 0;
      const value = morningPeak + eveningPeak;
      table.push({
        start,
        seg: value,
        ter: value,
        qua: value,
        qui: value,
        sex: value,
        sab: morningPeak,
        dom: morningPeak,
      });
    }
  }
  return table;
}

describe("runMathSuggestion", () => {
  it("returns 4 agents that satisfy every documented hiring rule", () => {
    const result = runMathSuggestion({ month: "Teste 2026", deficitTable: buildDeficitTable() });

    expect(result.success).toBe(true);
    expect(result.agents).toHaveLength(4);

    const folgaCounts: Record<string, number> = {};

    for (const a of result.agents) {
      // 9-hour shift, starting exactly on the hour, between 07:00 and 15:00.
      const [startH] = a.inicio.split(":").map(Number);
      const [endH] = a.fim.split(":").map(Number);
      expect(a.inicio.endsWith(":00")).toBe(true);
      expect(a.fim.endsWith(":00")).toBe(true);
      expect(startH).toBeGreaterThanOrEqual(7);
      expect(startH).toBeLessThanOrEqual(15);
      expect((endH - startH + 24) % 24).toBe(9);

      // Folga must be one of the 4 valid combos.
      const folgaSorted = [...a.folga].sort();
      const isValidCombo = VALID_FOLGA_COMBOS.some(
        (combo) => JSON.stringify([...combo].sort()) === JSON.stringify(folgaSorted),
      );
      expect(isValidCombo).toBe(true);

      // Working days + folga must cover all 7 days with no overlap (5x2 split).
      const allDays = [...a.dias_trabalho, ...a.folga];
      expect(new Set(allDays).size).toBe(7);
      expect(a.dias_trabalho).toHaveLength(5);
      expect(a.folga).toHaveLength(2);

      const key = folgaSorted.join(",");
      folgaCounts[key] = (folgaCounts[key] || 0) + 1;
    }

    // At most 2 agents may share the exact same folga combination.
    for (const count of Object.values(folgaCounts)) {
      expect(count).toBeLessThanOrEqual(2);
    }

    // At least one agent must cover the afternoon/evening shift.
    const hasLateShift = result.agents.some((a) => parseInt(a.inicio.split(":")[0], 10) >= 12);
    expect(hasLateShift).toBe(true);
  }, 30000);
});

describe("estimateAgentsNeeded", () => {
  function emptyDeficitTable(): AiSuggestionRequest["deficitTable"] {
    const table: AiSuggestionRequest["deficitTable"] = [];
    for (let h = 7; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        const start = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        table.push({ start, seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0, dom: 0 });
      }
    }
    return table;
  }

  it("returns 0 when there is no deficit anywhere", () => {
    expect(estimateAgentsNeeded({ deficitTable: emptyDeficitTable() })).toBe(0);
  });

  it("returns 1 for a small deficit a single shift fully covers", () => {
    const table = emptyDeficitTable();
    const row = table.find((r) => r.start === "10:00")!;
    row.seg = 1;
    expect(estimateAgentsNeeded({ deficitTable: table })).toBe(1);
  });

  it("never exceeds maxAgents even under a very heavy deficit", () => {
    const table = buildDeficitTable(); // heavy, spread across every day/time
    const result = estimateAgentsNeeded({ deficitTable: table }, 3);
    expect(result).toBeLessThanOrEqual(3);
    expect(result).toBeGreaterThan(0);
  });

  it("needs more (or equal) agents for a heavier deficit than a lighter one", () => {
    const light = emptyDeficitTable();
    light.find((r) => r.start === "10:00")!.seg = 1;

    const heavy = buildDeficitTable(); // deficit across every day and multiple peaks

    const lightCount = estimateAgentsNeeded({ deficitTable: light });
    const heavyCount = estimateAgentsNeeded({ deficitTable: heavy });

    expect(heavyCount).toBeGreaterThanOrEqual(lightCount);
  });
});
