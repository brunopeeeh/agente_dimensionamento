import { useMemo, useState } from "react";
import { fmtNum } from "@/lib/utils";
import { RotateCcw, TrendingUp, Users, Headphones, Bot, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { matchAgentName } from "@/lib/agents";
import { useDimensionamento, Day, TeamAgent } from "@/context/DimensionamentoContext";
import { DaySelector } from "@/components/DaySelector";
import { Tooltip } from "@/components/ui/tooltip";

const SHIFT_HOURS = 8;

function deriveRow(mediaTri: number) {
  const mediaMes = mediaTri / 3;
  const resolvidosDia = Math.ceil(mediaMes / 20);
  const resolvidosHora = resolvidosDia / SHIFT_HOURS;
  const resolvidos20 = resolvidosHora / 3;
  const resolvidos10 = resolvidosHora / 6;
  return { mediaMes, resolvidosDia, resolvidosHora, resolvidos20, resolvidos10 };
}

const isScheduledOnDay = (agent: TeamAgent, day: Day) => {
  if (!agent.active || !agent.schedules[day]) return false;
  return Object.values(agent.schedules[day]!.intervals).some(
    (s) => s === "trabalhando" || s === "externo" || s === "pausa",
  );
};

export function AgentCapacity() {
  const capacityAgents = useDimensionamento((s) => s.capacityAgents);
  const updateCapacityAgent = useDimensionamento((s) => s.updateCapacityAgent);
  const resetAll = useDimensionamento((s) => s.resetAll);
  const isReadOnly = useDimensionamento((s) => s.isReadOnly);
  const teamAgents = useDimensionamento((s) => s.teamAgents);
  const currentMonth = useDimensionamento((s) => s.currentMonth);
  const refreshCurrentMonth = useDimensionamento((s) => s.refreshCurrentMonth);
  const [selectedDay, setSelectedDay] = useState<Day | "Todos">("Todos");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleFreshchatSync = async () => {
    if (!currentMonth) {
      toast.error("Selecione um mês de planejamento antes de sincronizar.");
      return;
    }
    setIsSyncing(true);
    const loadingId = toast.loading(`Sincronizando Freshchat → ${currentMonth}…`);
    try {
      const teamAgentNames = teamAgents.filter((a) => a.active).map((a) => a.name);
      const res = await fetch("/api/sync-from-freshchat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month: currentMonth, teamAgentNames }),
      });
      const data = (await res.json()) as {
        success: boolean;
        message: string;
        agents_synced: number;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      await refreshCurrentMonth();
      toast.success(data.message, { id: loadingId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha no sync: ${message}`, { id: loadingId });
    } finally {
      setIsSyncing(false);
    }
  };

  const rows = capacityAgents.map((a) => ({ ...a, ...deriveRow(a.mediaTri) }));

  const supportRow = rows.find((r) => r.name === "Yooga Suporte");
  const aiRow = rows.find((r) => r.name === "Care AI");

  // Dynamically map active team agents to capacity humanRows, defaulting mediaTri to 750
  const humanRows = useMemo(() => {
    return teamAgents
      .filter((agent) => {
        if (!agent.active) return false;
        const nameNorm = agent.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        return nameNorm !== "yooga suporte" && nameNorm !== "care ai" && nameNorm !== "care ia";
      })
      .map((agent) => {
        const capMatch = capacityAgents.find((ca) => matchAgentName(ca.name, agent.name));
        const mediaTri = capMatch ? capMatch.mediaTri : 750;
        return {
          name: agent.name,
          mediaTri,
          ...deriveRow(mediaTri),
        };
      });
  }, [teamAgents, capacityAgents]);

  const humanAgentsFiltered = useMemo(() => {
    if (selectedDay === "Todos") {
      return humanRows;
    }
    return humanRows.filter((row) => {
      const match = teamAgents.find((agent) => agent.name === row.name);
      if (!match) return false;
      return isScheduledOnDay(match, selectedDay);
    });
  }, [humanRows, selectedDay, teamAgents]);

  // Total active human agents in the entire team roster (constant across days)
  const totalTeamAgentsCount = useMemo(() => {
    return teamAgents.filter((agent) => {
      if (!agent.active) return false;
      const nameNorm = agent.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      return nameNorm !== "yooga suporte" && nameNorm !== "care ai" && nameNorm !== "care ia";
    }).length;
  }, [teamAgents]);

  // Divisor dynamically switches between total team count (for Visão Geral) and daily count (for specific days)
  const currentDivisor = useMemo(() => {
    if (selectedDay === "Todos") {
      return totalTeamAgentsCount;
    }
    return humanAgentsFiltered.length;
  }, [selectedDay, totalTeamAgentsCount, humanAgentsFiltered]);

  const totalResolvidosHora = useMemo(() => {
    const list = humanAgentsFiltered;
    const humanSum = list.reduce((s, r) => s + r.resolvidosHora, 0);
    const supportVal = supportRow ? Math.ceil(supportRow.mediaTri / 3 / 20) / SHIFT_HOURS : 0;
    const aiVal = aiRow ? Math.ceil(aiRow.mediaTri / 3 / 20) / SHIFT_HOURS : 0;
    return humanSum + supportVal + aiVal;
  }, [humanAgentsFiltered, supportRow, aiRow]);

  const currentCapacity = useMemo(() => {
    const divisor = currentDivisor + 1; // total agents + 1 (Yooga Tecnologia/Suporte)
    return totalResolvidosHora / Math.max(divisor, 1);
  }, [totalResolvidosHora, currentDivisor]);

  const currentCapacityTag = useMemo(() => {
    const divisor = currentDivisor + 2; // total agents + Yooga Tecnologia (1) + Care AI (1)
    return totalResolvidosHora / Math.max(divisor, 1);
  }, [totalResolvidosHora, currentDivisor]);

  const totalResolvidos20 = useMemo(() => {
    const list = humanAgentsFiltered;
    const humanSum = list.reduce((s, r) => s + r.resolvidos20, 0);
    const supportVal = supportRow ? Math.ceil(supportRow.mediaTri / 3 / 20) / SHIFT_HOURS / 3 : 0;
    const aiVal = aiRow ? Math.ceil(aiRow.mediaTri / 3 / 20) / SHIFT_HOURS / 3 : 0;
    return humanSum + supportVal + aiVal;
  }, [humanAgentsFiltered, supportRow, aiRow]);

  const currentCapacity20min = useMemo(() => {
    const divisor = currentDivisor + 1; // total agents + 1 (Yooga Tecnologia/Suporte)
    return totalResolvidos20 / Math.max(divisor, 1);
  }, [totalResolvidos20, currentDivisor]);

  const totalResolvidos10 = useMemo(() => {
    const list = humanAgentsFiltered;
    const humanSum = list.reduce((s, r) => s + r.resolvidos10, 0);
    const supportVal = supportRow ? Math.ceil(supportRow.mediaTri / 3 / 20) / SHIFT_HOURS / 6 : 0;
    const aiVal = aiRow ? Math.ceil(aiRow.mediaTri / 3 / 20) / SHIFT_HOURS / 6 : 0;
    return humanSum + supportVal + aiVal;
  }, [humanAgentsFiltered, supportRow, aiRow]);

  const currentCapacityWebchat = useMemo(() => {
    const divisor = currentDivisor + 1; // total agents + 1 (Yooga Tecnologia/Suporte)
    return totalResolvidos10 / Math.max(divisor, 1);
  }, [totalResolvidos10, currentDivisor]);

  const currentCapacityWhats = useMemo(() => {
    return (currentCapacityWebchat * 4) / 3;
  }, [currentCapacityWebchat]);

  return (
    <div className="space-y-6">
      {/* Premium themed operational cards grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Equipe Care */}
        <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-md border-border">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Equipe Care</span>
            <div className="text-3xl font-bold tracking-tight mt-0.5 text-foreground">
              {humanAgentsFiltered.length}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium lowercase">
              agentes ativos
            </span>
          </div>
        </div>

        {/* Card 2: Yooga Suporte */}
        <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-md border-border">
          <div className="p-3 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Yooga Suporte</span>
            <div className="text-3xl font-bold tracking-tight mt-0.5 text-foreground">
              {supportRow ? Math.ceil(supportRow.mediaTri / 3 / 20) : 61}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium lowercase">
              resolvidos/dia
            </span>
          </div>
        </div>

        {/* Card 3: Care AI */}
        <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-md border-border">
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Care AI</span>
            <div className="text-3xl font-bold tracking-tight mt-0.5 text-foreground">
              {aiRow ? Math.ceil(aiRow.mediaTri / 3 / 20) : 245}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium lowercase">
              resolvidos/dia
            </span>
          </div>
        </div>
      </div>

      {/* Métricas de Capacidade Premium Card */}
      <div className="rounded-xl border bg-card p-5 shadow-sm border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Métricas de Capacidade
        </h3>
        <div
          className={`grid gap-3 ${selectedDay === "Todos" ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2"}`}
        >
          {selectedDay === "Todos" && (
            <>
              {/* Capsule 1: Capacity */}
              <div className="bg-muted/40 border border-border/80 rounded-lg p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-0.5">
                  Capacity{" "}
                  <Tooltip content="Capacidade média de conversas resolvidas por hora por analista humano." />
                </span>
                <div className="text-xl font-bold text-foreground mt-1 font-mono tracking-tight">
                  {fmtNum(currentCapacity, 2)}
                </div>
              </div>
              {/* Capsule 2: Capacity/Tag */}
              <div className="bg-muted/40 border border-border/80 rounded-lg p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-0.5">
                  Capacity/Tag{" "}
                  <Tooltip content="Capacidade média do analista dividida considerando a equipe total mais o Suporte Yooga e a IA." />
                </span>
                <div className="text-xl font-bold text-foreground mt-1 font-mono tracking-tight">
                  {fmtNum(currentCapacityTag, 2)}
                </div>
              </div>
              {/* Capsule 3: Capacity/20min */}
              <div className="bg-muted/40 border border-border/80 rounded-lg p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-0.5">
                  Capacity/20min{" "}
                  <Tooltip content="Capacidade média calculada em blocos de 20 minutos (usada no WhatsApp)." />
                </span>
                <div className="text-xl font-bold text-foreground mt-1 font-mono tracking-tight">
                  {fmtNum(currentCapacity20min, 2)}
                </div>
              </div>
            </>
          )}
          {/* Capsule 4: Capacity/Webchat */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3 text-center">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-0.5">
              Capacity/Webchat{" "}
              <Tooltip content="Capacidade média resolvida em blocos de 10 minutos para Webchat." />
            </span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono tracking-tight">
              {fmtNum(currentCapacityWebchat, 2)}
            </div>
          </div>
          {/* Capsule 5: Capacity/Whats */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3 text-center">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-center gap-0.5">
              Capacity/Whats{" "}
              <Tooltip content="Capacidade média resolvida em blocos de 10 minutos para WhatsApp." />
            </span>
            <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1 font-mono tracking-tight">
              {fmtNum(currentCapacityWhats, 2)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Capacity por Agente</h2>
              <p className="text-xs text-muted-foreground">
                Edite o volume trimestral (os demais valores são recalculados automaticamente).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleFreshchatSync}
                disabled={isSyncing || isReadOnly}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Sincronizando…" : "Sincronizar com Freshchat"}
              </button>
              <button
                onClick={resetAll}
                disabled={isReadOnly}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-3 w-3" /> Restaurar valores
              </button>
            </div>
          </div>

          <DaySelector
            value={selectedDay}
            onChange={setSelectedDay}
            includeAll
            className="border-t border-border/40 pt-3.5"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <Th>Team Member {selectedDay !== "Todos" && selectedDay}</Th>
                <Th right>Média / Tri</Th>
                <Th right>Média / Mês</Th>
                <Th right>Resolv / Dia</Th>
                <Th right>Resolv / Hora</Th>
                <Th right>/ 20min</Th>
                <Th right>/ 10min</Th>
              </tr>
            </thead>
            <tbody>
              {humanAgentsFiltered.map((r) => (
                <tr key={r.name} className="border-b hover:bg-accent/30">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      aria-label={`Média trimestral de ${r.name}`}
                      value={r.mediaTri}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        updateCapacityAgent(r.name, v);
                      }}
                      disabled={isReadOnly}
                      className="w-24 border bg-background px-2 py-1 text-right tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <Td>{fmtNum(r.mediaMes, 1)}</Td>
                  <Td bold>{r.resolvidosDia}</Td>
                  <Td>{fmtNum(r.resolvidosHora, 3)}</Td>
                  <Td>{fmtNum(r.resolvidos20, 3)}</Td>
                  <Td>{fmtNum(r.resolvidos10, 3)}</Td>
                </tr>
              ))}

              {/* Blank separator row to divide active agents from Yooga Suporte and Care AI */}
              {humanAgentsFiltered.length > 0 && (
                <tr className="h-6 bg-muted/5 border-b border-border/10">
                  <td colSpan={7} className="p-0"></td>
                </tr>
              )}

              {/* Static Average and AI Rows */}
              {supportRow && (
                <tr className="border-b bg-muted/10 font-medium">
                  <td className="px-4 py-2.5 text-muted-foreground">{supportRow.name}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      aria-label={`Média trimestral de ${supportRow.name}`}
                      value={supportRow.mediaTri}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        updateCapacityAgent(supportRow.name, v);
                      }}
                      disabled={isReadOnly}
                      className="w-24 border bg-background px-2 py-1 text-right tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <Td>{fmtNum(supportRow.mediaMes, 1)}</Td>
                  <Td bold>{supportRow.resolvidosDia}</Td>
                  <Td>{fmtNum(supportRow.resolvidosHora, 3)}</Td>
                  <Td>{fmtNum(supportRow.resolvidos20, 3)}</Td>
                  <Td>{fmtNum(supportRow.resolvidos10, 3)}</Td>
                </tr>
              )}
              {aiRow && (
                <tr className="border-b last:border-0 bg-muted/20 font-semibold">
                  <td className="px-4 py-2.5 text-foreground">{aiRow.name}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      aria-label={`Média trimestral de ${aiRow.name}`}
                      value={aiRow.mediaTri}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        updateCapacityAgent(aiRow.name, v);
                      }}
                      disabled={isReadOnly}
                      className="w-24 border bg-background px-2 py-1 text-right tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <Td>{fmtNum(aiRow.mediaMes, 1)}</Td>
                  <Td bold>{aiRow.resolvidosDia}</Td>
                  <Td>{fmtNum(aiRow.resolvidosHora, 3)}</Td>
                  <Td>{fmtNum(aiRow.resolvidos20, 3)}</Td>
                  <Td>{fmtNum(aiRow.resolvidos10, 3)}</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-2.5 font-medium ${right ? "text-right" : ""}`}>{children}</th>;
}
function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td
      className={`px-4 py-2 text-right tabular-nums ${bold ? "font-semibold" : "text-muted-foreground"}`}
    >
      {children}
    </td>
  );
}
