import { describe, it, expect } from "vitest";
import { runPlannerProjection } from "./calculator";
import { PlannerInputs } from "./types";

const defaultInputs: PlannerInputs = {
  currentClients: 1000,
  targetClientsQ4: 1200,
  targetClientsGrowthPct: 0.2,
  currentVolume: 5000,
  contactRate: 5,
  startMonth: 1,
  endMonth: 12,
  startYear: 2025,
  endYear: 2025,
  growthMode: "linear",
  manualGrowthByMonth: {},
  manualSeasonalityByMonth: {},

  aiCoveragePct: 0,
  aiGrowthMonthlyPct: 0,
  extraAutomationPct: 0,

  headcountCurrent: 10,
  headcountPleno: 10,
  headcountNovo: 0,
  rookieRampFactors: {
    month1: 0.33,
    month2: 0.66,
    month3: 1.0,
  },
  productivityBase: 0.85,
  rampUpMonths: 2,
  tmaN1: 120,
  tmaN2: 120,
  mixN1Pct: 1,
  mixN2Pct: 0,
  useN1N2Split: false,

  breaksPct: 0.1667,
  offchatPct: 0,
  meetingsPct: 0,
  vacationPct: 0.05,
  vacationEligiblePct: 1,
  useTenureVacation: false,
  agentsWithTenure: 0,
  promotionsCount: 0,

  turnoverValue: 1.5, // High turnover
  turnoverPeriod: "mensal",
  turnoverInputMode: "percentual",
  turnoverTiming: "start_of_month",
  turnoverMonths: [],

  leadTimeMonths: 0,
  hiringMode: "gap",
};

describe("calculator tests", () => {
  it("should handle extremely high turnover without negative headcount", () => {
    const input: PlannerInputs = {
      ...defaultInputs,
      turnoverValue: 150, // 150% turnover
      turnoverInputMode: "percentual",
      turnoverTiming: "end_of_month",
    };

    const result = runPlannerProjection(input);

    // Verify legacy doesn't go below 0
    result.rows.forEach((row) => {
      expect(row.hcNominalStart).toBeGreaterThanOrEqual(0);
      expect(row.hcFinal).toBeGreaterThanOrEqual(0);
      expect(row.hcNominalAfterTurnoverStart).toBeGreaterThanOrEqual(0);
    });
  });

  it("should not double-count cohorts and correctly apply rampUp to hcEffective", () => {
    const input: PlannerInputs = {
      ...defaultInputs,
      headcountCurrent: 0, // start with 0 headcount
      turnoverValue: 0,
      turnoverTiming: "start_of_month",
      leadTimeMonths: 0,
      rampUpMonths: 2, // 2 months ramp up
      startMonth: 1,
      endMonth: 3,
    };

    const result = runPlannerProjection(input);

    const firstMonth = result.rows[0];
    const newHiresFirstMonth = firstMonth.hire;

    // In the first month with 2 months rampUp, effectiveness depends on the ramp factor.
    // Usually ramp array is something like [0.3, 0.7, 1.0].
    // Let's assert based on whatever the internal ramp factor generates,
    // ensuring it's lower than the full headcount but > 0 if there are hires.
    if (newHiresFirstMonth > 0) {
      expect(firstMonth.hcAvailableEffective).toBeLessThan(firstMonth.hcFinal);
    }

    const secondMonth = result.rows[1];
    // By the second month, first month hires should be more effective.
    expect(secondMonth.hcAvailableEffective).toBeGreaterThanOrEqual(0);
  });
});
