import { useState, useMemo } from "react";
import {
  useDimensionamento,
  DAYS,
  Day,
  TeamAgent,
  NewAgentHire,
} from "@/context/DimensionamentoContext";
import { getNewHireDayShift, getShiftRangeFromSchedule } from "@/lib/time";
import { Search, Users, Briefcase, Calendar, Info } from "lucide-react";

interface EscalaRow {
  id: string;
  name: string;
  type: "CLT" | "Simulado";
  active: boolean;
  shifts: Record<Day, string>;
}

export function PrevisaoEscala() {
  const teamAgents = useDimensionamento((s) => s.teamAgents);
  const newHires = useDimensionamento((s) => s.newHires);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | "clt" | "simulado">("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("ativos");

  const getCltAgentDayShift = (agent: TeamAgent, day: Day) =>
    getShiftRangeFromSchedule(agent.schedules[day]);

  const getSimulatedAgentDayShift = (hire: NewAgentHire, day: Day) => getNewHireDayShift(hire, day);

  // Combine CLT and Simulated agents into a single dataset
  const combinedAgents = useMemo<EscalaRow[]>(() => {
    const cltRows: EscalaRow[] = teamAgents.map((agent) => {
      const shifts = {} as Record<Day, string>;
      DAYS.forEach((d) => {
        shifts[d] = getCltAgentDayShift(agent, d);
      });
      return {
        id: agent.id,
        name: agent.name,
        type: "CLT",
        active: agent.active,
        shifts,
      };
    });

    const hireRows: EscalaRow[] = newHires.map((hire) => {
      const shifts = {} as Record<Day, string>;
      DAYS.forEach((d) => {
        shifts[d] = getSimulatedAgentDayShift(hire, d);
      });
      return {
        id: hire.id,
        name: hire.name,
        type: "Simulado",
        active: hire.active,
        shifts,
      };
    });

    return [...cltRows, ...hireRows];
  }, [teamAgents, newHires]);

  // Filter the dataset based on state
  const filteredAgents = useMemo(() => {
    return combinedAgents.filter((agent) => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === "todos" ||
        (typeFilter === "clt" && agent.type === "CLT") ||
        (typeFilter === "simulado" && agent.type === "Simulado");

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "ativos" && agent.active) ||
        (statusFilter === "inativos" && !agent.active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [combinedAgents, searchQuery, typeFilter, statusFilter]);

  // Calculate daily headcount stats (only considering ACTIVE agents)
  const dailyBreakdown = useMemo(() => {
    const breakdown = {} as Record<Day, { total: number; clt: number; simulado: number }>;
    DAYS.forEach((day) => {
      let clt = 0;
      let simulado = 0;
      combinedAgents.forEach((agent) => {
        if (agent.active && agent.shifts[day] !== "FOLGA") {
          if (agent.type === "CLT") clt++;
          else simulado++;
        }
      });
      breakdown[day] = {
        total: clt + simulado,
        clt,
        simulado,
      };
    });
    return breakdown;
  }, [combinedAgents]);

  // Total statistics for summary cards
  const stats = useMemo(() => {
    const totalCltActive = teamAgents.filter((a) => a.active).length;
    const totalSimulatedActive = newHires.filter((h) => h.active).length;
    const totalSimulated = newHires.length;

    return {
      cltActive: totalCltActive,
      simulatedActive: totalSimulatedActive,
      simulatedTotal: totalSimulated,
      totalActive: totalCltActive + totalSimulatedActive,
    };
  }, [teamAgents, newHires]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">
              Projeção de Equipe Ativa
            </p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">
              {stats.totalActive} Agentes
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.cltActive} CLT + {stats.simulatedActive} simulados ativos
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">
              Novas Contratações IA
            </p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">
              {stats.simulatedActive} Ativos
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.simulatedTotal} sugeridos no simulador
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">
              Escala CLT Vigente
            </p>
            <h3 className="text-xl font-bold text-blue-600 mt-0.5">{stats.cltActive} Ativos</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Da equipe cadastrada no sistema
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar agente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 border rounded-lg p-0.5 bg-muted/20">
            <button
              onClick={() => setTypeFilter("todos")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                typeFilter === "todos"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter("clt")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                typeFilter === "clt"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              CLT
            </button>
            <button
              onClick={() => setTypeFilter("simulado")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                typeFilter === "simulado"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Simulado
            </button>
          </div>

          <div className="flex items-center gap-1.5 border rounded-lg p-0.5 bg-muted/20">
            <button
              onClick={() => setStatusFilter("ativos")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                statusFilter === "ativos"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ativos na Escala
            </button>
            <button
              onClick={() => setStatusFilter("todos")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                statusFilter === "todos"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos (Inc. Inativos)
            </button>
          </div>
        </div>
      </div>

      {/* Grid Sheet table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-slate-950 text-white border-b border-slate-800">
                <th className="p-4 font-semibold text-center w-[160px]">AGENTE</th>
                <th className="p-4 font-semibold text-center w-[100px]">TIPO</th>
                {DAYS.map((day) => {
                  const bd = dailyBreakdown[day];
                  return (
                    <th
                      key={day}
                      className="p-4 font-semibold text-center border-l border-slate-850"
                    >
                      <div className="uppercase tracking-wider text-[10px]">{day.slice(0, 3)}</div>
                      <div className="mt-1 text-[11px] text-emerald-400 font-bold">
                        {bd.total} Ag.
                      </div>
                      <div className="text-[9px] text-muted-foreground/60 font-normal">
                        ({bd.clt} CLT + {bd.simulado} Sim)
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Nenhum agente localizado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  const isSim = agent.type === "Simulado";
                  const isInactive = !agent.active;

                  return (
                    <tr
                      key={agent.id}
                      className={`hover:bg-muted/10 transition-colors ${
                        isInactive ? "opacity-50 bg-muted/5 line-through" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="p-3 font-semibold text-foreground text-center">
                        <div className="flex flex-col items-center">
                          <span>{agent.name}</span>
                          {isInactive && (
                            <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wider mt-0.5 bg-rose-500/10 px-1 rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isSim
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }`}
                        >
                          {agent.type}
                        </span>
                      </td>

                      {/* Weekdays */}
                      {DAYS.map((day) => {
                        const shift = agent.shifts[day];
                        const isOff = shift === "FOLGA";

                        return (
                          <td
                            key={day}
                            className="p-3 text-center border-l border-border/40 font-mono"
                          >
                            {isOff ? (
                              <span className="inline-block px-2 py-1 rounded bg-muted/40 text-muted-foreground/40 text-[10px] font-medium tracking-wide">
                                FOLGA
                              </span>
                            ) : (
                              <span
                                className={`inline-block px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                                  isSim
                                    ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                    : "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {shift}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper Box */}
      <div className="rounded-xl border bg-muted/20 p-4 flex gap-3 text-xs text-muted-foreground border-border">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Como funciona a Previsão de Escala?</p>
          <p className="leading-relaxed">
            Esta tabela unifica a escala da equipe cadastrada no sistema (CLT) com os agentes
            adicionados temporariamente no simulador à direita. Para cada dia, o cabeçalho mostra a
            quantidade de agentes escalados para trabalhar. Os agentes simulados inativos no painel
            lateral são mostrados opacos e não somam no headcount diário.
          </p>
        </div>
      </div>
    </div>
  );
}
