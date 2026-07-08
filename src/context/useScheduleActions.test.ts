// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useScheduleActions } from "./useScheduleActions";
import type { TeamAgent, NewAgentHire, Day } from "./types";

function setup() {
  return renderHook(() => {
    const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([
      { id: "a1", name: "Agente Teste", active: true, schedules: {} },
    ]);
    const [newHires, setNewHires] = useState<NewAgentHire[]>([]);
    const actions = useScheduleActions(setTeamAgents, setNewHires, () => newHires);
    return { teamAgents, actions };
  });
}

describe("applyPresetShift - overnight shift crossing midnight", () => {
  it("marks the post-midnight external window as 'externo', not 'trabalhando'", () => {
    const { result } = setup();

    act(() => {
      result.current.actions.applyPresetShift(
        "a1",
        "Segunda" as Day,
        "18:00",
        "03:00",
        "22:00",
        "02:00",
        60,
      );
    });

    const intervals = result.current.teamAgents[0].schedules.Segunda!.intervals;

    // Regression: these used to stay "trabalhando" because the external time
    // window was compared in raw 0-1440 clock minutes while the shift loop
    // counted continuous minutes past midnight (see useScheduleActions.ts).
    expect(intervals["02:00"]).toBe("externo");
    expect(intervals["02:20"]).toBe("externo");
    expect(intervals["02:40"]).toBe("externo");

    // Blocks outside the external window and lunch stay regular work.
    expect(intervals["20:00"]).toBe("trabalhando");
    expect(intervals["22:00"]).toBe("pausa");
  });

  it("still marks a same-day external window correctly", () => {
    const { result } = setup();

    act(() => {
      result.current.actions.applyPresetShift(
        "a1",
        "Terça" as Day,
        "09:00",
        "18:00",
        "13:00",
        "11:00",
        40,
      );
    });

    const intervals = result.current.teamAgents[0].schedules["Terça"]!.intervals;
    expect(intervals["11:00"]).toBe("externo");
    expect(intervals["11:20"]).toBe("externo");
    expect(intervals["11:40"]).toBe("trabalhando");
    expect(intervals["13:00"]).toBe("pausa");
  });
});
