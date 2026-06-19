import type { Day, RowCalculation } from "@/context/DimensionamentoContext";

const DAYS_SHORT: { day: Day; label: string }[] = [
  { day: "Segunda", label: "SEG" },
  { day: "Terça", label: "TER" },
  { day: "Quarta", label: "QUA" },
  { day: "Quinta", label: "QUI" },
  { day: "Sexta", label: "SEX" },
  { day: "Sábado", label: "SABADO" },
  { day: "Domingo", label: "DOMINGO" },
];

type Props = {
  mode: "actual" | "provaReal";
  rowCalculations: RowCalculation[];
  getActiveAgentsCount: (time: string, day: Day) => number;
  getProvaRealAgentsCount: (time: string, day: Day) => number;
};

export function TimeIntervalCountTable({
  mode,
  rowCalculations,
  getActiveAgentsCount,
  getProvaRealAgentsCount,
}: Props) {
  const times =
    rowCalculations.length > 0
      ? rowCalculations.map((r) => r.time)
      : Array.from({ length: (24 - 7) * 6 }).map((_, i) => {
          const totalMin = 7 * 60 + i * 10;
          const h = Math.floor(totalMin / 60);
          const m = totalMin % 60;
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        });

  return (
    <div className="overflow-x-auto max-h-[70vh] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
      <table className="border-collapse text-xs w-full text-center table-fixed bg-background/50">
        <colgroup>
          <col style={{ width: "16%" }} />
          {DAYS_SHORT.map((_, idx) => (
            <col key={idx} style={{ width: "12%" }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-slate-950 text-white border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
          <tr>
            <th className="p-3 border-r border-slate-800">HORA</th>
            {DAYS_SHORT.map((d, idx) => (
              <th key={idx} className="p-3 border-r border-slate-800 last:border-r-0">
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
          {times.map((time) => (
            <tr key={time} className="hover:bg-muted/10 transition-colors">
              <td className="p-2 border-r border-slate-100 dark:border-slate-800 font-bold bg-muted/20 text-muted-foreground text-center">
                {time}
              </td>
              {DAYS_SHORT.map((d, idx) => {
                const count =
                  mode === "actual"
                    ? getActiveAgentsCount(time, d.day)
                    : getProvaRealAgentsCount(time, d.day);

                return (
                  <td
                    key={idx}
                    className={`p-2 border-r border-slate-100 dark:border-slate-800 last:border-r-0 font-semibold text-center ${
                      count > 0
                        ? "text-foreground bg-primary/5"
                        : "text-muted-foreground/30 font-normal"
                    }`}
                  >
                    {count > 0 ? count : ""}
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
