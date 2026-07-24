import type { Day, TeamAgent } from "@/context/types";

export type VolumeMap = Record<string, Record<Day, number>>;

/**
 * Aplica um pico de chamados (+pct%) nas colunas dos dias selecionados.
 *
 * Usado pelo simulador de cenários para responder "e se a Segunda tiver +30%
 * de chamados?" sem tocar nos volumes reais — retorna uma cópia; o mapa
 * original nunca é mutado.
 *
 * Os volumes reais são médias fracionárias por bloco de 10min (ex.: 0,31
 * chamado), não contagens inteiras — arredondar aqui zeraria os blocos abaixo
 * de 0,5 e o pico acabaria REDUZINDO o volume. A engine já aplica ceil() onde
 * o número precisa virar agente.
 */
export function applyVolumeSpike(vols: VolumeMap, days: readonly Day[], pct: number): VolumeMap {
  if (pct === 0 || days.length === 0) return vols;

  const factor = 1 + pct / 100;
  const affected = new Set(days);
  const out: VolumeMap = {};

  for (const time of Object.keys(vols)) {
    const row = vols[time];
    const nextRow = { ...row } as Record<Day, number>;
    for (const day of affected) {
      const value = row[day];
      if (value) nextRow[day] = value * factor;
    }
    out[time] = nextRow;
  }

  return out;
}

/**
 * Marca analistas como ausentes na escala simulada.
 *
 * Sem dias selecionados (`days` vazio) a ausência é total — o agente sai da
 * conta de capacidade via `active: false`. Com dias selecionados, o agente
 * continua ativo mas seus horários viram "folga" só nesses dias.
 *
 * Espelha tanto um analista mudando de setor (saída do time) quanto férias ou
 * atestado. Retorna uma cópia; a escala real nunca é mutada.
 */
export function applyAbsence(
  agents: TeamAgent[],
  absentIds: ReadonlySet<string>,
  days: readonly Day[],
): TeamAgent[] {
  if (absentIds.size === 0) return agents;

  return agents.map((agent) => {
    if (!absentIds.has(agent.id)) return agent;
    if (days.length === 0) return { ...agent, active: false };

    const schedules = { ...agent.schedules };
    for (const day of days) {
      const schedule = schedules[day];
      if (!schedule) continue;
      const intervals: Record<string, "folga"> = {};
      for (const time of Object.keys(schedule.intervals)) {
        intervals[time] = "folga";
      }
      schedules[day] = { intervals };
    }
    return { ...agent, schedules };
  });
}
