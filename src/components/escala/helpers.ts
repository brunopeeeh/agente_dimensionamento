import type { Day, TeamAgent } from "@/context/DimensionamentoContext";

export function checkWeekendViolation(agent: TeamAgent): boolean {
  const hasSat =
    agent.schedules["Sábado"] &&
    Object.values(agent.schedules["Sábado"]!.intervals).some(
      (s) => s === "trabalhando" || s === "externo",
    );
  const hasDom =
    agent.schedules["Domingo"] &&
    Object.values(agent.schedules["Domingo"]!.intervals).some(
      (s) => s === "trabalhando" || s === "externo",
    );
  return !!(hasSat && hasDom);
}

export function getAgentWorkedHours(agent: TeamAgent, day: Day): number {
  if (!agent.schedules[day]) return 0;
  const workingBlocks = Object.values(agent.schedules[day]!.intervals).filter(
    (s) => s === "trabalhando" || s === "externo",
  ).length;
  return (workingBlocks * 20) / 60;
}

export function countActiveDays(agent: TeamAgent): number {
  return Object.keys(agent.schedules).filter((day) => {
    return Object.values(agent.schedules[day as Day]!.intervals).some(
      (s) => s === "trabalhando" || s === "externo" || s === "pausa",
    );
  }).length;
}
