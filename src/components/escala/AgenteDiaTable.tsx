import type { Day } from "@/context/DimensionamentoContext";

const DAY_COLUMNS: { day: Day; label: string }[] = [
  { day: "Segunda", label: "Segunda-Feira" },
  { day: "Terça", label: "Terça-Feira" },
  { day: "Quarta", label: "Quarta-Feira" },
  { day: "Quinta", label: "Quinta-Feira" },
  { day: "Sexta", label: "Sexta-Feira" },
  { day: "Sábado", label: "Sábado" },
  { day: "Domingo", label: "Domingo" },
];

type Props = {
  getAgentsForDay: (day: Day) => string[];
};

export function AgenteDiaTable({ getAgentsForDay }: Props) {
  const dataByDay = DAY_COLUMNS.map((col) => ({
    label: col.label,
    agents: getAgentsForDay(col.day),
  }));

  const maxRows = Math.max(...dataByDay.map((d) => d.agents.length), 1);

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
      <table className="border-collapse text-xs w-full text-center table-fixed bg-background/50">
        <thead>
          <tr className="bg-slate-950 text-white border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
            {dataByDay.map((d, idx) => (
              <th key={idx} className="p-3.5 border-r border-slate-850 last:border-r-0">
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {Array.from({ length: maxRows }).map((_, rIdx) => (
            <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
              {dataByDay.map((d, cIdx) => {
                const agentName = d.agents[rIdx] || "";
                const isYoogaSuporte = agentName === "Yooga Suporte";
                return (
                  <td
                    key={cIdx}
                    className={`p-3 border-r border-slate-100 dark:border-slate-800 last:border-r-0 font-medium ${
                      isYoogaSuporte ? "text-primary font-bold bg-primary/5" : "text-foreground"
                    }`}
                  >
                    {agentName}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
