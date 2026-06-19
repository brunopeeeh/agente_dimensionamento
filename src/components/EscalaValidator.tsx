import { useMemo, useState } from "react";
import { useDimensionamento, DAYS, Day, AgentSchedule } from "@/context/DimensionamentoContext";
import { getActiveTimeBlocks, getNext20MinTime } from "@/lib/time";
import {
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ValidationItem = {
  id: string;
  name: string;
  active: boolean;
  type: "team" | "hire";
  days: Day[];
  start_time: string;
  end_time: string;
  errors: string[];
  warnings: string[];
  valid: boolean;
};

export function EscalaValidator() {
  const teamAgents = useDimensionamento((s) => s.teamAgents);
  const newHires = useDimensionamento((s) => s.newHires);
  const [showTeam, setShowTeam] = useState(true);
  const [showHires, setShowHires] = useState(true);

  // Validate a single agent's schedules
  const validateAgent = (
    id: string,
    name: string,
    active: boolean,
    type: "team" | "hire",
    days: Day[],
    startTime: string,
    endTime: string,
    schedules?: Partial<Record<Day, AgentSchedule>>,
  ): ValidationItem => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!active) {
      return {
        id,
        name,
        active,
        type,
        days,
        start_time: startTime,
        end_time: endTime,
        errors,
        warnings,
        valid: true,
      };
    }

    // 1. Check scale is 5x2 (exactly 5 active working days)
    if (days.length !== 5) {
      errors.push(
        `Escala incompatível com regime 5x2: o analista trabalha ${days.length} dias em vez de 5.`,
      );
    }

    // 2. Determine off days (folgas)
    const offDays = DAYS.filter((d) => !days.includes(d));

    // 3. Rule: Off days must be between Saturday and Tuesday
    const allowedOffDays: Day[] = ["Sábado", "Domingo", "Segunda", "Terça"];
    const invalidOffDays = offDays.filter((d) => !allowedOffDays.includes(d));
    if (invalidOffDays.length > 0) {
      errors.push(
        `Folga em janela restrita Yooga: folgas em (${invalidOffDays.join(", ")}) devem ocorrer estritamente entre Sábado e Terça-feira.`,
      );
    }

    // 4. Rule: Sábado and Domingo off CANNOT be consecutive
    const hasSaturdayOff = offDays.includes("Sábado");
    const hasSundayOff = offDays.includes("Domingo");
    if (hasSaturdayOff && hasSundayOff) {
      errors.push(
        "Folga dupla no Fim de Semana: Proibido folgar Sábado e Domingo na mesma semana.",
      );
    }

    // 5. Rule: Working days cannot have consecutive Saturday + Sunday (Answer 3: NUNCA trabalham consecutivamente no fds)
    const worksSaturday = days.includes("Sábado");
    const worksSunday = days.includes("Domingo");
    if (worksSaturday && worksSunday) {
      errors.push(
        "VIOLAÇÃO DE FIM DE SEMANA CLT: Agente escalado para trabalhar Sábado e Domingo consecutivos (NÃO PERMITIDO).",
      );
    }

    // 6. Check shifts duration (9 hours)
    if (type === "team" && schedules) {
      // Validate each day's schedule individually for active team agents
      Object.entries(schedules).forEach(([day, sched]) => {
        const intervals = sched.intervals || {};
        const activeBlocks = Object.values(intervals).filter(
          (s) => s === "trabalhando" || s === "externo",
        ).length;
        const breakBlocks = Object.values(intervals).filter((s) => s === "pausa").length;

        const workedHours = (activeBlocks * 20) / 60;
        const breakHours = (breakBlocks * 20) / 60;

        if (workedHours !== 8) {
          warnings.push(
            `Jornada ativa irregular na ${day}: ${workedHours.toFixed(1)}h de trabalho efetivo (Esperado 8h).`,
          );
        }
        if (breakHours !== 1) {
          warnings.push(
            `Pausa de almoço irregular na ${day}: ${breakHours.toFixed(1)}h (Esperado 1h / 3 blocos).`,
          );
        }
      });
    } else {
      // Validate default time for new hires
      try {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
          let durationMin = eh * 60 + em - (sh * 60 + sm);
          if (durationMin < 0) durationMin += 24 * 60;

          if (durationMin !== 9 * 60) {
            warnings.push(
              `Carga horária irregular: Turno de ${durationMin / 60}h (Diferente da jornada Yooga de 8h + 1h almoço).`,
            );
          }
        }
      } catch {
        errors.push("Erro ao analisar formato de hora de entrada/saída (HH:MM).");
      }
    }

    return {
      id,
      name,
      active,
      type,
      days,
      start_time: startTime,
      end_time: endTime,
      errors,
      warnings,
      valid: errors.length === 0,
    };
  };

  const teamResults = useMemo(() => {
    return teamAgents.map((agent) => {
      const days = Object.keys(agent.schedules) as Day[];
      // Sort days based on original order
      const sortedDays = DAYS.filter((d) => days.includes(d));

      const firstDay = sortedDays[0];
      let start = "09:00";
      let end = "18:00";
      if (firstDay && agent.schedules[firstDay]) {
        const activeIntervals = getActiveTimeBlocks(agent.schedules[firstDay]!.intervals);
        if (activeIntervals.length > 0) {
          start = activeIntervals[0];
          end = getNext20MinTime(activeIntervals[activeIntervals.length - 1]);
        }
      }

      return validateAgent(
        agent.id,
        agent.name,
        agent.active,
        "team",
        sortedDays,
        start,
        end,
        agent.schedules,
      );
    });
  }, [teamAgents]);

  const hireResults = useMemo(() => {
    return newHires.map((hire) => {
      return validateAgent(
        hire.id,
        hire.name,
        hire.active,
        "hire",
        hire.days,
        hire.start_time,
        hire.end_time,
      );
    });
  }, [newHires]);

  const allValid = teamResults.every((r) => r.valid) && hireResults.every((r) => r.valid);
  const totalViolations =
    teamResults.reduce((s, r) => s + r.errors.length, 0) +
    hireResults.reduce((s, r) => s + r.errors.length, 0);

  return (
    <div className="rounded-none border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h3 className="font-semibold text-sm tracking-tight uppercase text-foreground">
            Auditoria Trabalhista Yooga & CLT
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Validador em tempo real da escala 5x2, jornadas de 9h e descanso semanal consecutivo.
          </p>
        </div>
        <div>
          {allValid ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/50 px-2 py-0.5 rounded-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Escala
              100% Regular
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-800 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/50 px-2 py-0.5 rounded-sm animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-450" />{" "}
              {totalViolations} Inconsistências Detectadas
            </span>
          )}
        </div>
      </div>

      {/* 1. CURRENT ACTIVE TEAM SECTION */}
      <div className="space-y-2">
        <button
          onClick={() => setShowTeam(!showTeam)}
          className="flex items-center justify-between w-full text-xs font-semibold py-1.5 px-2 bg-muted/30 border border-border text-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>
              Equipe Suporte Care ({teamResults.filter((r) => r.active).length} analistas ativos)
            </span>
            {!teamResults.every((r) => r.valid) && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </span>
          {showTeam ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showTeam && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            {teamResults.map((res) => (
              <div
                key={res.id}
                className={`rounded-none border p-3 transition-all ${
                  !res.active
                    ? "bg-muted/10 border-border/40 opacity-40"
                    : res.valid
                      ? "bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800/50"
                      : "bg-amber-50/20 border-amber-100 dark:bg-amber-950/5 dark:border-amber-950/30 hover:border-amber-300 dark:hover:border-amber-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" /> {res.name}
                  </span>
                  {res.active ? (
                    res.valid ? (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                        OK
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 tracking-wider animate-pulse">
                        ALERTA
                      </span>
                    )
                  ) : (
                    <span className="text-[9px] font-bold text-muted-foreground">INATIVO</span>
                  )}
                </div>

                {res.active && (
                  <div className="mt-1.5 space-y-2">
                    <div className="text-[10px] text-muted-foreground">
                      Dias ({res.days.length}):{" "}
                      <span className="text-foreground font-semibold">
                        {res.days.map((d) => d.slice(0, 3)).join(", ") || "Nenhum"}
                      </span>
                    </div>
                    {res.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="flex gap-1.5 text-[9px] leading-tight text-amber-900 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/50 p-1 px-1.5 rounded-sm"
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-550" />
                        <span>{err}</span>
                      </div>
                    ))}
                    {res.warnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className="flex gap-1.5 text-[9px] leading-tight text-amber-800 bg-amber-50/50 border border-amber-100 dark:text-amber-400 dark:bg-amber-950/10 dark:border-amber-900/30 p-1 px-1.5 rounded-sm"
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                        <span>{warn}</span>
                      </div>
                    ))}
                    {res.valid && (
                      <div className="flex gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Escala regular.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. NEW HIRES SIMULATED SECTION */}
      <div className="space-y-2 pt-2">
        <button
          onClick={() => setShowHires(!showHires)}
          className="flex items-center justify-between w-full text-xs font-semibold py-1.5 px-2 bg-muted/30 border border-border text-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>
              Simulador de Contratações ({hireResults.filter((r) => r.active).length} ativos)
            </span>
            {!hireResults.every((r) => r.valid) && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </span>
          {showHires ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showHires && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            {hireResults.length === 0 ? (
              <div className="text-[10px] text-muted-foreground p-3 border border-dashed text-center sm:col-span-2 lg:col-span-3">
                Nenhum agente adicionado no simulador de contratações.
              </div>
            ) : (
              hireResults.map((res) => (
                <div
                  key={res.id}
                  className={`rounded-none border p-3 transition-all ${
                    !res.active
                      ? "bg-muted/10 border-border/40 opacity-40"
                      : res.valid
                        ? "bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800/50"
                        : "bg-amber-50/20 border-amber-100 dark:bg-amber-950/5 dark:border-amber-950/30 hover:border-amber-300 dark:hover:border-amber-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" /> {res.name}{" "}
                      <span className="text-[8px] px-1 bg-primary/10 text-primary uppercase rounded-sm font-semibold">
                        Simulado
                      </span>
                    </span>
                    {res.active ? (
                      res.valid ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                          OK
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 tracking-wider animate-pulse">
                          ALERTA
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] font-bold text-muted-foreground">INATIVO</span>
                    )}
                  </div>

                  {res.active && (
                    <div className="mt-1.5 space-y-2">
                      <div className="text-[10px] text-muted-foreground">
                        Turno:{" "}
                        <span className="text-foreground font-semibold">
                          {res.start_time} - {res.end_time}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Dias ({res.days.length}):{" "}
                        <span className="text-foreground font-semibold">
                          {res.days.map((d) => d.slice(0, 3)).join(", ")}
                        </span>
                      </div>
                      {res.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="flex gap-1.5 text-[9px] leading-tight text-amber-900 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/50 p-1 px-1.5 rounded-sm"
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-550" />
                          <span>{err}</span>
                        </div>
                      ))}
                      {res.warnings.map((warn, idx) => (
                        <div
                          key={idx}
                          className="flex gap-1.5 text-[9px] leading-tight text-amber-800 bg-amber-50/50 border border-amber-100 dark:text-amber-400 dark:bg-amber-950/10 dark:border-amber-900/30 p-1 px-1.5 rounded-sm"
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                          <span>{warn}</span>
                        </div>
                      ))}
                      {res.valid && (
                        <div className="flex gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Escala regular.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
