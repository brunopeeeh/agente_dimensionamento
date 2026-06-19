import { useMemo } from "react";
import { DAYS, type Day } from "./types";

// Gera blocos de tempo a cada 10 minutos de 07:00 até 06:50 do dia seguinte
function generateTimeBlocks(): string[] {
  const blocks: string[] = [];
  // Gera 24h começando às 07:00, pulando de 10 em 10 minutos
  for (let offset = 0; offset < 24; offset++) {
    const h = (7 + offset) % 24;
    for (let m = 0; m < 60; m += 10) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      blocks.push(`${hh}:${mm}`);
    }
  }
  return blocks;
}

export function useInitialData() {
  const timeBlocks = useMemo(() => generateTimeBlocks(), []);

  const initialData = useMemo(() => {
    const webchatVolumes: Record<string, Record<Day, number>> = {};
    const whatsappVolumes: Record<string, Record<Day, number>> = {};
    const agentsScheduled: Record<string, Record<Day, number>> = {};

    timeBlocks.forEach((time) => {
      webchatVolumes[time] = {} as Record<Day, number>;
      whatsappVolumes[time] = {} as Record<Day, number>;
      agentsScheduled[time] = {} as Record<Day, number>;

      DAYS.forEach((day) => {
        webchatVolumes[time][day] = 0;
        whatsappVolumes[time][day] = 0;
        agentsScheduled[time][day] = 0;
      });
    });

    return { webchatVolumes, whatsappVolumes, agentsScheduled };
  }, [timeBlocks]);

  const initialCapacityAgents = useMemo(() => {
    return []; // Retorna lista vazia agora (usuário adicionará manualmente o capacity agent)
  }, []);

  return { timeBlocks, initialData, initialCapacityAgents };
}
