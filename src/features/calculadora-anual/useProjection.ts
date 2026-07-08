import { useMemo } from "react";
import { runPlannerProjection, resolveContactRate, computeCapacityPerAgent } from "./engine";
import type { PlannerInputs, ProjectionResult } from "./engine";

export type CapacityEstimate = {
  capacityPerAgent: number;
  monthlyDemand: number;
  projectedDemand: number;
  agentsNeededNow: number;
  agentsNeededQ4: number;
  totalGrowthPct: number;
};

export function useProjection(inputs: PlannerInputs): {
  projection: ProjectionResult;
  inferredContactRate: number;
  resolvedContactRate: number;
  contactRateSource: "manual" | "inferido";
  contactRateDriftPct: number;
  estimate: CapacityEstimate;
} {
  // A projeção cobre no máximo 24 meses de aritmética escalar — cálculo síncrono
  // é sub-milissegundo, então o Web Worker do projeto de origem foi descartado.
  const projection = useMemo(() => runPlannerProjection(inputs), [inputs]);

  const inferredContactRate =
    inputs.currentClients > 0 ? inputs.currentVolume / inputs.currentClients : 0;
  const contactRateSource: "manual" | "inferido" = inputs.contactRate > 0 ? "manual" : "inferido";
  const contactRateDriftPct =
    inferredContactRate > 0
      ? (Math.abs(inputs.contactRate - inferredContactRate) / inferredContactRate) * 100
      : 0;

  const estimate = useMemo<CapacityEstimate>(() => {
    const capacityPerAgent = computeCapacityPerAgent(inputs);
    const monthlyDemand = inputs.currentClients * inputs.contactRate;
    const projectedDemand = inputs.targetClientsQ4 * inputs.contactRate;
    return {
      capacityPerAgent,
      monthlyDemand,
      projectedDemand,
      agentsNeededNow: Math.ceil(monthlyDemand / Math.max(1, capacityPerAgent)),
      agentsNeededQ4: Math.ceil(projectedDemand / Math.max(1, capacityPerAgent)),
      totalGrowthPct:
        inputs.currentClients > 0
          ? ((inputs.targetClientsQ4 - inputs.currentClients) / inputs.currentClients) * 100
          : 0,
    };
  }, [inputs]);

  return {
    projection,
    inferredContactRate,
    resolvedContactRate: resolveContactRate(inputs),
    contactRateSource,
    contactRateDriftPct,
    estimate,
  };
}
