import { Calendar } from "lucide-react";
import type { Day, TeamAgent } from "@/context/DimensionamentoContext";
import { getNext20MinTime } from "@/lib/time";
import { formatDayHeader, getCellStyles } from "./constants";

type Props = {
  activeDay: Day;
  viewMode: "global" | "resumida";
  onViewModeChange: (mode: "global" | "resumida") => void;
  visibleAgents: TeamAgent[];
  timeBlocks20: string[];
  readOnlyCLT: boolean;
  getAgentDaySummary: (agent: TeamAgent, day: Day) => string;
  onToggleInterval: (agentId: string, day: Day, block: string) => void;
};

export function ScheduleGrid({
  activeDay,
  viewMode,
  onViewModeChange,
  visibleAgents,
  timeBlocks20,
  readOnlyCLT,
  getAgentDaySummary,
  onToggleInterval,
}: Props) {
  if (visibleAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/80 bg-muted/5 space-y-3">
        <Calendar className="h-8 w-8 text-muted-foreground/60" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nenhum analista escalado
          </h4>
          <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
            Não há analistas com turnos configurados para **{activeDay}**. Use o botão **Configurar
            Escala** no topo para aplicar turnos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-between items-center border-b border-border pb-3 gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Escala de {activeDay}
          </h3>

          <div className="inline-flex border border-border p-0.5 bg-muted/20 rounded-none">
            <button
              type="button"
              onClick={() => onViewModeChange("global")}
              className={`px-2.5 py-1 text-[9px] font-bold uppercase transition-all rounded-none ${
                viewMode === "global"
                  ? "bg-primary text-primary-foreground font-extrabold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Global
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("resumida")}
              className={`px-2.5 py-1 text-[9px] font-bold uppercase transition-all rounded-none ${
                viewMode === "resumida"
                  ? "bg-primary text-primary-foreground font-extrabold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Resumida
            </button>
          </div>
        </div>

        {viewMode === "global" && (
          <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-muted-foreground animate-in fade-in duration-200">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 bg-[#c2deb9] rounded-sm border border-slate-200"></span>{" "}
              Ativo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 bg-[#bae1ff] rounded-sm border border-slate-200"></span>{" "}
              Demanda Externa
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 bg-[#ffd1b3] rounded-sm border border-slate-200"></span>{" "}
              Almoço
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 bg-white dark:bg-[#1a1b23] rounded-sm border border-slate-200"></span>{" "}
              Folga
            </span>
          </div>
        )}
      </div>

      {viewMode === "resumida" ? (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm animate-in fade-in duration-250">
          <table className="border-collapse text-xs table-fixed w-full text-left bg-background/50">
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "24%" }} />
            </colgroup>
            <thead>
              <tr className="bg-muted/50 border-b border-slate-200 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-3.5 pl-5">Analista</th>
                <th className="p-3.5">Turno de Trabalho</th>
                <th className="p-3.5">Horário de Almoço</th>
                <th className="p-3.5">Demanda Externa (Offchat)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {visibleAgents.map((agent) => {
                const summaryStr = getAgentDaySummary(agent, activeDay);
                if (summaryStr === "Folga") return null;

                let shift = "-";
                let lunch = "-";
                let ext = "-";

                const shiftMatch = summaryStr.match(/^(\d{2}:\d{2} às \d{2}:\d{2})/);
                if (shiftMatch) shift = shiftMatch[1];

                const lunchMatch = summaryStr.match(/\(Almoço: (\d{2}:\d{2} às \d{2}:\d{2})\)/);
                if (lunchMatch) lunch = lunchMatch[1];

                const extMatch = summaryStr.match(/\(Offchat: (\d{2}:\d{2} às \d{2}:\d{2})\)/);
                if (extMatch) ext = extMatch[1];

                return (
                  <tr key={agent.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 pl-5 font-bold text-foreground flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${agent.isSimulated ? "bg-emerald-500 animate-pulse" : "bg-emerald-400"}`}
                      ></span>
                      <span className="truncate">{agent.name}</span>
                      {agent.isSimulated && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 scale-90">
                          Simulado
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-foreground font-mono">{shift}</td>
                    <td className="p-3.5 font-medium font-mono">
                      {lunch !== "-" ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50 px-2 py-0.5 rounded-sm font-semibold text-[10px] uppercase">
                          {lunch}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 font-sans font-normal">-</span>
                      )}
                    </td>
                    <td className="p-3.5 font-medium font-mono">
                      {ext !== "-" ? (
                        <span className="bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50 px-2 py-0.5 rounded-sm font-semibold text-[10px] uppercase">
                          {ext}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 font-sans font-normal">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[75vh] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm animate-in fade-in duration-250">
          <table className="border-collapse text-sm table-fixed w-full">
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 44 }} />
              {visibleAgents.map((a) => (
                <col key={a.id} style={{ width: 104 }} />
              ))}
              <col style={{ width: 52 }} />
            </colgroup>
            <thead className="sticky top-0 z-20 bg-card border-b border-slate-200 dark:border-slate-800">
              <tr className="bg-muted/50">
                <th
                  className="sticky left-0 bg-card z-30 p-2 font-semibold text-center border-r border-slate-200 dark:border-slate-800"
                  colSpan={2}
                >
                  <div className="flex justify-center text-red-600 dark:text-red-500 font-bold uppercase tracking-wider text-xs">
                    {formatDayHeader(activeDay)}
                  </div>
                </th>
                {visibleAgents.map((col) => (
                  <th
                    key={col.id}
                    className={`border border-slate-200 dark:border-slate-800 px-2 py-2 font-medium text-center text-xs leading-tight whitespace-nowrap bg-card select-none ${col.isSimulated ? "border-emerald-500/20" : ""}`}
                    style={{ width: 104, maxWidth: 104 }}
                    title={col.name}
                  >
                    <span className="block truncate">{col.name}</span>
                    {col.isSimulated && (
                      <span className="block text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5 scale-90">
                        Simulado
                      </span>
                    )}
                  </th>
                ))}
                <th className="border border-slate-200 dark:border-slate-800 p-2 font-bold text-center text-red-600 bg-muted/80 w-[52px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {timeBlocks20.map((block) => {
                const endTime20 = getNext20MinTime(block);
                const activeCount = visibleAgents.filter((agent) => {
                  const status = agent.schedules[activeDay]?.intervals[block];
                  return status === "trabalhando";
                }).length;

                return (
                  <tr key={block} className="hover:bg-muted/30 transition-colors">
                    <td className="border border-slate-200 dark:border-slate-800 p-1 text-center text-xs text-muted-foreground sticky left-0 z-10 bg-background/95 font-medium border-r-0 w-[44px]">
                      {block}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-800 p-1 text-center text-xs text-muted-foreground sticky left-11 z-10 bg-background/95 font-medium border-l-0 w-[44px]">
                      {endTime20}
                    </td>
                    {visibleAgents.map((agent) => {
                      const status = agent.schedules[activeDay]?.intervals[block] || "folga";
                      const isSim = agent.isSimulated;
                      const canEdit = !(readOnlyCLT && !isSim);
                      const cellLabel = `${agent.name}, ${block} às ${getNext20MinTime(block)}: ${status}`;
                      return (
                        <td
                          key={agent.id}
                          className="p-0 border border-slate-200 dark:border-slate-800 text-center w-[104px]"
                        >
                          <div
                            role="button"
                            tabIndex={canEdit ? 0 : -1}
                            aria-label={cellLabel}
                            aria-disabled={!canEdit}
                            onClick={() => {
                              if (!canEdit) return;
                              onToggleInterval(agent.id, activeDay, block);
                            }}
                            onKeyDown={(e) => {
                              if (!canEdit) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onToggleInterval(agent.id, activeDay, block);
                              }
                            }}
                            className={`w-full h-8 flex items-center justify-center font-sans text-xs font-semibold select-none border-0 rounded-none uppercase transition-all duration-200 ease-in-out hover:scale-[1.04] hover:z-10 hover:shadow-[0_2px_10px_rgba(0,0,0,0.15)] ${
                              canEdit ? "cursor-pointer" : "cursor-not-allowed"
                            } ${getCellStyles(status, isSim)} ${!agent.active ? "opacity-20" : ""}`}
                          >
                            {status === "trabalhando" && "1"}
                          </div>
                        </td>
                      );
                    })}
                    <td className="border border-slate-200 dark:border-slate-800 p-1 text-center font-bold bg-muted/30 text-muted-foreground w-[52px]">
                      {activeCount > 0 ? activeCount : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
