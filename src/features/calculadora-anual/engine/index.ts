export type {
  ScenarioKey,
  GrowthMode,
  HiringMode,
  TurnoverPeriod,
  TurnoverInputMode,
  TurnoverTiming,
  RookieRampMonth,
  RookieRampFactors,
  PlannerInputs,
  MonthPoint,
  CohortContribution,
  MonthlyProjection,
  ProjectionSummary,
  ProjectionResult,
} from "./types";

export { runPlannerProjection } from "./calculator";
export {
  computeCapacityPerAgent,
  resolveContactRate,
  computeAdjustedMix,
  computeTenureVacationPct,
} from "./capacity";
export { buildTimeline, getTimelineKey } from "./timeline";
export { getRampFactor } from "./ramp";
export {
  SCENARIO_PRESETS,
  EMPTY_PLANNER_INPUTS,
  DEFAULT_ROOKIE_RAMP_FACTORS,
  BASE_YEAR,
  scenarioLabels,
} from "./scenarios";
export { monthNames, formatInt, formatDecimal, formatPct, clamp } from "./format";
export {
  parseLooseNumber,
  formatNumberForDisplay,
  isTransientNumericInput,
  inferDecimalDigitsFromStep,
  type NumberFieldFormat,
} from "./number-input";
