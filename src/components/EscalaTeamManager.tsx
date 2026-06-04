import React, { useState, useMemo } from "react";
import {
  useDimensionamento,
  DAYS,
  Day,
  TeamAgent,
  IntervalStatus,
} from "@/context/DimensionamentoContext";
import {
  UserPlus,
  Trash,
  ShieldAlert,
  Calendar,
  Clock,
  RotateCcw,
  Plus,
  SlidersHorizontal,
  X,
  CheckCircle,
  Edit2,
  Check,
} from "lucide-react";

const EXTRA_TABS = ["Agente dia", "Quantidade de agente dia", "Agente prova real"] as const;
type TabType = Day | typeof EXTRA_TABS[number];

export function EscalaTeamManager() {
  const {
    teamAgents,
    toggleIntervalStatus,
    applyPresetShift,
    toggleAgentActive,
    addTeamAgent,
    removeTeamAgent,
    resetAll,
    updateTeamAgentName,
    rowCalculations,
    newHires,
  } = useDimensionamento();

  const [activeDay, setActiveDay] = useState<Day>("Segunda");
  const [activeTab, setActiveTab] = useState<TabType>("Segunda");
  const [newAgentName, setNewAgentName] = useState("");
  const [selectedAgentForPreset, setSelectedAgentForPreset] = useState<string>("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Custom shift builder states
  const [selectedDays, setSelectedDays] = useState<Record<Day, boolean>>({
    Segunda: true,
    Terça: true,
    Quarta: true,
    Quinta: true,
    Sexta: true,
    Sábado: false,
    Domingo: false,
  });
  const [selectedShiftIndex, setSelectedShiftIndex] = useState<number>(0);
  const [selectedLunchTime, setSelectedLunchTime] = useState<string>("12:00");
  const [selectedExternalTime, setSelectedExternalTime] = useState<string>("");
  const [selectedExternalDuration, setSelectedExternalDuration] = useState<number>(60);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"global" | "resumida">("global");

  // Helpers for the extra views
  const getAgentsForDay = (day: Day): string[] => {
    const activeAgents = teamAgents.filter((agent) => {
      if (!agent.active || !agent.schedules[day]) return false;
      return Object.values(agent.schedules[day]!.intervals).some(
        (s) => s === "trabalhando" || s === "externo" || s === "pausa",
      );
    });

    const getAgentStartTimeMinutesLocal = (agent: TeamAgent) => {
      const daySched = agent.schedules[day];
      if (!daySched || !daySched.intervals) return 24 * 60 * 2;

      const timeKeys = Object.keys(daySched.intervals).sort();
      const activeBlocks = timeKeys.filter((t) => {
        const s = daySched.intervals[t];
        return s === "trabalhando" || s === "externo" || s === "pausa";
      });

      if (activeBlocks.length === 0) return 24 * 60 * 2;

      const firstBlock = activeBlocks[0];
      const [h, m] = firstBlock.split(":").map(Number);
      let mins = h * 60 + m;

      if (h < 7) {
        mins += 24 * 60;
      }

      return mins;
    };

    const getAgentLunchStartMinutesLocal = (agent: TeamAgent) => {
      const daySched = agent.schedules[day];
      if (!daySched || !daySched.intervals) return 24 * 60 * 2;

      const timeKeys = Object.keys(daySched.intervals).sort();
      const lunchBlocks = timeKeys.filter((t) => daySched.intervals[t] === "pausa");
      if (lunchBlocks.length === 0) return 24 * 60 * 2;

      const firstLunchBlock = lunchBlocks[0];
      const [h, m] = firstLunchBlock.split(":").map(Number);
      return h * 60 + m;
    };

    const sortedAgents = [...activeAgents].sort((a, b) => {
      const timeA = getAgentStartTimeMinutesLocal(a);
      const timeB = getAgentStartTimeMinutesLocal(b);

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      const lunchA = getAgentLunchStartMinutesLocal(a);
      const lunchB = getAgentLunchStartMinutesLocal(b);
      if (lunchA !== lunchB) {
        return lunchA - lunchB;
      }

      return a.name.localeCompare(b.name);
    });

    const list = sortedAgents.map((agent) => agent.name);

    list.push("Yooga Suporte");
    return list;
  };

  const getActiveAgentsCount = (time: string, day: Day) => {
    return teamAgents.reduce((count, agent) => {
      if (agent.active && agent.schedules[day]) {
        const [h, m] = time.split(":").map(Number);
        const m20 = Math.floor(m / 20) * 20;
        const time20 = `${h.toString().padStart(2, "0")}:${m20.toString().padStart(2, "0")}`;
        const status = agent.schedules[day]!.intervals[time20] || "folga";
        if (status === "trabalhando") {
          return count + 1;
        }
      }
      return count;
    }, 0);
  };

  const isTimeInShift = (time: string, start: string, end: string): boolean => {
    const [h, m] = time.split(":").map(Number);
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    const val = h * 60 + m;
    const startVal = startH * 60 + startM;
    let endVal = endH * 60 + endM;

    if (endVal < startVal) {
      endVal += 24 * 60;
      const nextDayVal = val + 24 * 60;
      return (val >= startVal && val < 24 * 60) || (nextDayVal >= startVal && nextDayVal < endVal);
    }

    return val >= startVal && val < endVal;
  };

  const getProvaRealAgentsCount = (time: string, day: Day) => {
    const agentsSch = getActiveAgentsCount(time, day);
    const activeNewHires = newHires.reduce((count, hire) => {
      if (
        hire.active &&
        hire.days.includes(day) &&
        isTimeInShift(time, hire.start_time, hire.end_time)
      ) {
        return count + 1;
      }
      return count;
    }, 0);
    return agentsSch + activeNewHires;
  };

  const renderAgenteDiaTable = () => {
    const columns: { day: Day; label: string }[] = [
      { day: "Segunda", label: "Segunda-Feira" },
      { day: "Terça", label: "Terça-Feira" },
      { day: "Quarta", label: "Quarta-Feira" },
      { day: "Quinta", label: "Quinta-Feira" },
      { day: "Sexta", label: "Sexta-Feira" },
      { day: "Sábado", label: "Sábado" },
      { day: "Domingo", label: "Domingo" },
    ];

    const dataByDay = columns.map((col) => ({
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
                        isYoogaSuporte
                          ? "text-primary font-bold bg-primary/5"
                          : "text-foreground"
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
  };

  const renderTimeIntervalCountTable = (mode: "actual" | "provaReal") => {
    const daysShort: { day: Day; label: string }[] = [
      { day: "Segunda", label: "SEG" },
      { day: "Terça", label: "TER" },
      { day: "Quarta", label: "QUA" },
      { day: "Quinta", label: "QUI" },
      { day: "Sexta", label: "SEX" },
      { day: "Sábado", label: "SABADO" },
      { day: "Domingo", label: "DOMINGO" },
    ];

    const times =
      rowCalculations && rowCalculations.length > 0
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
            {daysShort.map((_, idx) => (
              <col key={idx} style={{ width: "12%" }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-slate-950 text-white border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3 border-r border-slate-800">HORA</th>
              {daysShort.map((d, idx) => (
                <th key={idx} className="p-3 border-r border-slate-800 last:border-r-0">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {times.map((time) => {
              return (
                <tr key={time} className="hover:bg-muted/10 transition-colors">
                  <td className="p-2 border-r border-slate-100 dark:border-slate-800 font-bold bg-muted/20 text-muted-foreground text-center">
                    {time}
                  </td>
                  {daysShort.map((d, idx) => {
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
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const LUNCH_OPTIONS = useMemo(() => {
    const options: string[] = [];
    for (let h = 11; h <= 22; h++) {
      options.push(`${h.toString().padStart(2, "0")}:00`);
    }
    return options;
  }, []);

  // Shift presets including lunch break details
  const SHIFT_PRESETS = [
    { label: "Turno A (07-16)", start: "07:00", end: "16:00", lunch: "11:00" },
    { label: "Turno B (08-17)", start: "08:00", end: "17:00", lunch: "12:00" },
    { label: "Turno C (09-18)", start: "09:00", end: "18:00", lunch: "13:00" },
    { label: "Turno D (10-19)", start: "10:00", end: "19:00", lunch: "14:00" },
    { label: "Tarde A (11-20)", start: "11:00", end: "20:00", lunch: "14:00" },
    { label: "Tarde B (12-21)", start: "12:00", end: "21:00", lunch: "15:00" },
    { label: "Tarde C (13-22)", start: "13:00", end: "22:00", lunch: "17:00" },
    { label: "Noite A (14-23)", start: "14:00", end: "23:00", lunch: "18:00" },
    { label: "Noite B (15-00)", start: "15:00", end: "00:00", lunch: "19:00" },
    { label: "Noite C (16-01)", start: "16:00", end: "01:00", lunch: "20:00" },
    { label: "Fechamento (18-03)", start: "18:00", end: "03:00", lunch: "22:00" },
  ];

  // Generate the 20-min blocks for the grid from 07:00 to 23:40
  const timeBlocks20 = useMemo(() => {
    const blocks: string[] = [];
    let h = 7,
      m = 0;
    while (h < 24) {
      blocks.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      m += 20;
      if (m >= 60) {
        h += 1;
        m -= 60;
      }
    }
    return blocks;
  }, []);

  // Filter only agents who are scheduled (active & has any working/external/break intervals) for the selected day
  const visibleAgents = useMemo(() => {
    const activeAgents = teamAgents.filter((agent) => {
      if (!agent.active) return false;
      const daySched = agent.schedules[activeDay];
      if (!daySched) return false;
      return Object.values(daySched.intervals).some(
        (status) => status === "trabalhando" || status === "externo" || status === "pausa",
      );
    });

    const getAgentStartTimeMinutes = (agent: TeamAgent) => {
      const daySched = agent.schedules[activeDay];
      if (!daySched || !daySched.intervals) return 24 * 60 * 2;

      const timeKeys = Object.keys(daySched.intervals).sort();
      const activeBlocks = timeKeys.filter((t) => {
        const s = daySched.intervals[t];
        return s === "trabalhando" || s === "externo" || s === "pausa";
      });

      if (activeBlocks.length === 0) return 24 * 60 * 2;

      const firstBlock = activeBlocks[0];
      const [h, m] = firstBlock.split(":").map(Number);
      let mins = h * 60 + m;

      // If shift starts between 00:00 and 06:59 (late night/closing), push to the end of the list
      if (h < 7) {
        mins += 24 * 60;
      }

      return mins;
    };

    const getAgentLunchStartMinutes = (agent: TeamAgent) => {
      const daySched = agent.schedules[activeDay];
      if (!daySched || !daySched.intervals) return 24 * 60 * 2;

      const timeKeys = Object.keys(daySched.intervals).sort();
      const lunchBlocks = timeKeys.filter((t) => daySched.intervals[t] === "pausa");
      if (lunchBlocks.length === 0) return 24 * 60 * 2;

      const firstLunchBlock = lunchBlocks[0];
      const [h, m] = firstLunchBlock.split(":").map(Number);
      return h * 60 + m;
    };

    return [...activeAgents].sort((a, b) => {
      const timeA = getAgentStartTimeMinutes(a);
      const timeB = getAgentStartTimeMinutes(b);

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      const lunchA = getAgentLunchStartMinutes(a);
      const lunchB = getAgentLunchStartMinutes(b);
      if (lunchA !== lunchB) {
        return lunchA - lunchB;
      }

      return a.name.localeCompare(b.name);
    });
  }, [teamAgents, activeDay]);

  const getNext20MinTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    let nh = h,
      nm = m + 20;
    if (nm >= 60) {
      nh += 1;
      nm -= 60;
    }
    if (nh >= 24) nh = 0;
    return `${nh.toString().padStart(2, "0")}:${nm.toString().padStart(2, "0")}`;
  };

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    addTeamAgent(newAgentName.trim());
    setNewAgentName("");
  };

  const handleApplyCustomShift = () => {
    if (!selectedAgentForPreset) return;
    const preset = SHIFT_PRESETS[selectedShiftIndex];

    // Loop over each day of the week and apply the shift
    Object.entries(selectedDays).forEach(([dayStr, isChecked]) => {
      if (isChecked) {
        applyPresetShift(
          selectedAgentForPreset,
          dayStr as Day,
          preset.start,
          preset.end,
          selectedLunchTime,
          selectedExternalTime,
          selectedExternalDuration,
        );
      }
    });

    setSuccessMessage("Alterações realizadas com sucesso! 🎉");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleApplyFolga = () => {
    if (!selectedAgentForPreset) return;

    // Loop over each day of the week and apply Folga (00:00 to 00:00)
    Object.entries(selectedDays).forEach(([dayStr, isChecked]) => {
      if (isChecked) {
        applyPresetShift(selectedAgentForPreset, dayStr as Day, "00:00", "00:00", "00:00");
      }
    });
    setSuccessMessage("Folga registrada com sucesso! 🏖️");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleClearAgentDay = (agentId: string) => {
    applyPresetShift(agentId, activeDay, "00:00", "00:00", "00:00");
  };

  const getCellStyles = (status: IntervalStatus) => {
    switch (status) {
      case "trabalhando":
        return "bg-[#c6dfc0] text-[#2d5a27] hover:bg-[#b6cfb0] border-slate-200/50";
      case "externo":
        return "bg-[#bae1ff] text-[#1b4365] hover:bg-[#a6d4fa] border-slate-200/50";
      case "pausa":
        return "bg-[#f8b890] text-[#6d3000] hover:bg-[#e8a880] border-slate-200/50";
      case "folga":
      default:
        return "bg-white dark:bg-[#1a1b23] text-transparent hover:bg-slate-50 dark:hover:bg-slate-800/20 border-slate-200/20";
    }
  };

  const checkWeekendViolation = (agent: TeamAgent): boolean => {
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
  };

  const getAgentWorkedHours = (agent: TeamAgent, day: Day): number => {
    if (!agent.schedules[day]) return 0;
    const workingBlocks = Object.values(agent.schedules[day]!.intervals).filter(
      (s) => s === "trabalhando" || s === "externo",
    ).length;
    return (workingBlocks * 20) / 60;
  };

  const getAgentDaySummary = (agent: TeamAgent, day: Day): string => {
    const daySched = agent.schedules[day];
    if (!daySched || !daySched.intervals) return "Folga";

    const intervals = daySched.intervals;
    const timeKeys = Object.keys(intervals).sort();

    const activeBlocks = timeKeys.filter(
      (time) =>
        intervals[time] === "trabalhando" ||
        intervals[time] === "externo" ||
        intervals[time] === "pausa",
    );

    if (activeBlocks.length === 0) return "Folga";

    const startTime = activeBlocks[0];
    const lastBlock = activeBlocks[activeBlocks.length - 1];
    const endTime = getNext20MinTime(lastBlock);

    // Find lunch blocks
    const lunchBlocks = timeKeys.filter((time) => intervals[time] === "pausa");
    let lunchSummary = "";
    if (lunchBlocks.length > 0) {
      const lunchStart = lunchBlocks[0];
      const lastLunchBlock = lunchBlocks[lunchBlocks.length - 1];
      const lunchEnd = getNext20MinTime(lastLunchBlock);
      lunchSummary = ` (Almoço: ${lunchStart} às ${lunchEnd})`;
    }

    // Find external blocks
    const externalBlocks = timeKeys.filter((time) => intervals[time] === "externo");
    let extSummary = "";
    if (externalBlocks.length > 0) {
      const extStart = externalBlocks[0];
      const lastExtBlock = externalBlocks[externalBlocks.length - 1];
      const extEnd = getNext20MinTime(lastExtBlock);
      extSummary = ` (Offchat: ${extStart} às ${extEnd})`;
    }

    return `${startTime} às ${endTime}${lunchSummary}${extSummary}`;
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="rounded-none border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="inline-flex items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-none"
            title="Configurar presets e analistas"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Configurar Escala
          </button>

          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-none"
          >
            <RotateCcw className="h-3 w-3" /> Restaurar Originais
          </button>

          {/* Add Agent Compact Form */}
          <form onSubmit={handleAddAgent} className="flex gap-2">
            <input
              type="text"
              required
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder="Nome do analista..."
              className="bg-background border border-border text-xs px-3 py-1.5 focus:outline-none focus:border-primary rounded-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 hover:bg-primary/95 transition-all rounded-none hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Analista
            </button>
          </form>
        </div>

        {/* Day Selector Tabs */}
        <div className="flex flex-wrap gap-1 mt-6 border-b border-border pb-1">
          {DAYS.map((day) => {
            const isSelected = activeTab === day;
            const activeOnDayCount = teamAgents.filter((a) => {
              if (!a.active || !a.schedules[day]) return false;
              return Object.values(a.schedules[day]!.intervals).some(
                (s) => s === "trabalhando" || s === "externo" || s === "pausa",
              );
            }).length;

            return (
              <button
                key={day}
                onClick={() => {
                  setActiveTab(day);
                  setActiveDay(day);
                }}
                className={`px-4 py-2 text-xs font-bold transition-all rounded-none border-b-2 -mb-[2px] ${
                  isSelected
                    ? "border-primary text-foreground bg-muted/40 font-extrabold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {day}
                <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.2 text-muted-foreground font-medium rounded-sm">
                  {activeOnDayCount}
                </span>
              </button>
            );
          })}

          {EXTRA_TABS.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold transition-all rounded-none border-b-2 -mb-[2px] ${
                  isSelected
                    ? "border-primary text-foreground bg-muted/40 font-extrabold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid HUD Layout - Fullscreen Matrix or Extra Views */}
      {activeTab === "Agente dia" ? (
        <div className="rounded-none border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-border pb-3 gap-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Agente por Dia da Semana
            </h3>
          </div>
          {renderAgenteDiaTable()}
        </div>
      ) : activeTab === "Quantidade de agente dia" ? (
        <div className="rounded-none border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-border pb-3 gap-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Quantidade de Agentes (a cada 10 min)
            </h3>
          </div>
          {renderTimeIntervalCountTable("actual")}
        </div>
      ) : activeTab === "Agente prova real" ? (
        <div className="rounded-none border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-border pb-3 gap-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Agentes Prova Real (Simulado + Equipe)
            </h3>
          </div>
          {renderTimeIntervalCountTable("provaReal")}
        </div>
      ) : (
        <div className="rounded-none border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-border pb-3 gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                Escala de {activeDay}
              </h3>

              {/* View Mode Toggle Switch */}
              <div className="inline-flex border border-border p-0.5 bg-muted/20 rounded-none">
                <button
                  type="button"
                  onClick={() => setViewMode("global")}
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
                  onClick={() => setViewMode("resumida")}
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

          {visibleAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/80 bg-muted/5 space-y-3">
              <Calendar className="h-8 w-8 text-muted-foreground/60" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nenhum analista escalado
                </h4>
                <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                  Não há analistas com turnos configurados para **{activeDay}**. Use o botão
                  **Configurar Escala** no topo para aplicar turnos.
                </p>
              </div>
            </div>
          ) : viewMode === "resumida" ? (
            /* Summarized Hour-only View */
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

                    try {
                      const shiftMatch = summaryStr.match(/^(\d{2}:\d{2} às \d{2}:\d{2})/);
                      if (shiftMatch) {
                        shift = shiftMatch[1];
                      }

                      const lunchMatch = summaryStr.match(/\(Almoço: (\d{2}:\d{2} às \d{2}:\d{2})\)/);
                      if (lunchMatch) {
                        lunch = lunchMatch[1];
                      }

                      const extMatch = summaryStr.match(/\(Offchat: (\d{2}:\d{2} às \d{2}:\d{2})\)/);
                      if (extMatch) {
                        ext = extMatch[1];
                      }
                    } catch (e) {
                      console.error("Error parsing agent summary:", e);
                    }

                    return (
                      <tr key={agent.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-foreground flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                          {agent.name}
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
            /* Full Matrix View (Global) */
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
                        {activeDay === "Segunda"
                          ? "Segunda-feira"
                          : activeDay === "Terça"
                            ? "Terça-feira"
                            : activeDay === "Quarta"
                              ? "Quarta-feira"
                              : activeDay === "Quinta"
                                ? "Quinta-feira"
                                : activeDay === "Sexta"
                                  ? "Sexta-feira"
                                  : activeDay.toUpperCase()}
                      </div>
                    </th>
                    {visibleAgents.map((col) => (
                      <th
                        key={col.id}
                        className="border border-slate-200 dark:border-slate-800 px-2 py-2 font-medium text-center text-xs leading-tight whitespace-nowrap bg-card select-none"
                        style={{ width: 104, maxWidth: 104 }}
                        title={col.name}
                      >
                        <span className="block truncate">{col.name}</span>
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
                          return (
                            <td
                              key={agent.id}
                              className="p-0 border border-slate-200 dark:border-slate-800 text-center w-[104px]"
                            >
                              <div
                                onClick={() => toggleIntervalStatus(agent.id, activeDay, block)}
                                className={`w-full h-8 flex items-center justify-center font-sans text-xs font-semibold select-none border-0 rounded-none uppercase transition-all duration-200 ease-in-out hover:scale-[1.04] hover:z-10 hover:shadow-[0_2px_10px_rgba(0,0,0,0.15)] cursor-pointer ${getCellStyles(
                                  status,
                                )} ${!agent.active ? "opacity-20" : ""}`}
                              >
                                {status === "trabalhando" && "1"}
                                {status === "externo" && ""}
                                {status === "pausa" && ""}
                                {status === "folga" && ""}
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
        </div>
      )}

      {/* Floating Config Slide-over Drawer Panel */}
      {isConfigOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[5px] z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsConfigOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-card/95 backdrop-blur-md border-l border-border z-50 p-5 shadow-2xl flex flex-col justify-between transform transition-all duration-300 ease-in-out ${
          isConfigOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-primary" /> Configurações da Escala
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Presets de turnos e gerenciamento rápido de analistas.
              </p>
            </div>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 border border-transparent hover:border-border transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {successMessage && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 p-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-none animate-in fade-in slide-in-from-top-2 duration-200 mx-1">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Construtor de Escala Visual HUD */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-4">
              <h4 className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Construtor de Escala
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Configure turnos de 9 horas (8h úteis + 1h almoço) de forma extremamente fácil:
              </p>

              <div className="space-y-3.5">
                {/* 1. Analyst Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground">
                    Selecione o Analista
                  </label>
                  <select
                    value={selectedAgentForPreset}
                    onChange={(e) => setSelectedAgentForPreset(e.target.value)}
                    className="w-full bg-background border border-border text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="">-- Escolher Analista --</option>
                    {teamAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {!a.active ? " (Inativo)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAgentForPreset &&
                  (() => {
                    const selectedAgent = teamAgents.find((a) => a.id === selectedAgentForPreset);
                    if (!selectedAgent) return null;

                    return (
                      <div className="rounded-none border border-border bg-background/50 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" /> Escala Vigente -{" "}
                          {selectedAgent.name.split(" ")[0]}
                        </h4>
                        <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                          {DAYS.map((day) => {
                            const summary = getAgentDaySummary(selectedAgent, day);
                            const isFolga = summary === "Folga";
                            return (
                              <div
                                key={day}
                                className="flex justify-between items-center py-0.5 border-b border-border/10 last:border-0"
                              >
                                <span className="font-semibold text-muted-foreground w-12">
                                  {day}
                                </span>
                                <span
                                  className={`text-right truncate max-w-[240px] font-mono ${isFolga ? "text-muted-foreground/40 font-normal italic" : "text-foreground font-semibold"}`}
                                >
                                  {summary}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                {/* 2. Days Checkboxes */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                    Selecione os Dias
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map((day) => {
                      const isChecked = selectedDays[day];
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setSelectedDays((prev) => ({ ...prev, [day]: !prev[day] }))
                          }
                          className={`px-2 py-1 text-[9px] font-bold border transition-all rounded-none ${
                            isChecked
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-accent"
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDays({
                          Segunda: true,
                          Terça: true,
                          Quarta: true,
                          Quinta: true,
                          Sexta: true,
                          Sábado: false,
                          Domingo: false,
                        })
                      }
                      className="text-[9px] text-primary hover:underline font-bold"
                    >
                      Seg a Sex
                    </button>
                    <span className="text-[9px] text-muted-foreground/30">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDays({
                          Segunda: true,
                          Terça: true,
                          Quarta: true,
                          Quinta: true,
                          Sexta: true,
                          Sábado: true,
                          Domingo: true,
                        })
                      }
                      className="text-[9px] text-primary hover:underline font-bold"
                    >
                      Todos
                    </button>
                    <span className="text-[9px] text-muted-foreground/30">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDays({
                          Segunda: false,
                          Terça: false,
                          Quarta: false,
                          Quinta: false,
                          Sexta: false,
                          Sábado: false,
                          Domingo: false,
                        })
                      }
                      className="text-[9px] text-muted-foreground hover:underline font-bold"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* 3. Shift Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground">
                    Turno de Trabalho
                  </label>
                  <select
                    value={selectedShiftIndex}
                    onChange={(e) => setSelectedShiftIndex(Number(e.target.value))}
                    className="w-full bg-background border border-border text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono font-bold"
                  >
                    {SHIFT_PRESETS.map((p, idx) => (
                      <option key={p.label} value={idx}>
                        {p.start} às {p.end}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Lunch Start Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground">
                    Horário de Início do Almoço / Jantar
                  </label>
                  <select
                    value={selectedLunchTime}
                    onChange={(e) => setSelectedLunchTime(e.target.value)}
                    className="w-full bg-background border border-border text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono font-bold"
                  >
                    {LUNCH_OPTIONS.map((time) => {
                      const [h] = time.split(":").map(Number);
                      const endTime = `${((h + 1) % 24).toString().padStart(2, "0")}:00`;
                      return (
                        <option key={time} value={time}>
                          {time} às {endTime}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 5. Demanda Externa / Offchat Select */}
                <div className="space-y-3 p-3 border border-border/85 bg-background/40 rounded-none">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                      Demanda Externa (Offchat) - Opcional
                    </label>
                    <select
                      value={selectedExternalTime}
                      onChange={(e) => setSelectedExternalTime(e.target.value)}
                      className="w-full bg-background border border-border text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono font-bold"
                    >
                      <option value="">-- Sem Demanda Externa --</option>
                      {timeBlocks20
                        .filter((time) => time.endsWith(":00"))
                        .map((time) => (
                          <option key={time} value={time}>
                            Iniciar às {time}
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedExternalTime && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                        Duração da Demanda Externa
                      </label>
                      <select
                        value={selectedExternalDuration}
                        onChange={(e) => setSelectedExternalDuration(Number(e.target.value))}
                        className="w-full bg-background border border-border text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-bold"
                      >
                        <option value={60}>1 hora</option>
                        <option value={120}>2 horas</option>
                        <option value={180}>3 horas</option>
                        <option value={240}>4 horas</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleApplyCustomShift}
                    disabled={!selectedAgentForPreset || !Object.values(selectedDays).some(Boolean)}
                    className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 hover:bg-primary/95 transition-all rounded-none disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Aplicar Escala
                  </button>

                  <button
                    onClick={handleApplyFolga}
                    disabled={!selectedAgentForPreset || !Object.values(selectedDays).some(Boolean)}
                    className="border border-destructive text-destructive hover:bg-destructive/10 text-xs font-bold px-3 py-2 transition-all rounded-none disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                  >
                    Definir Folga
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions per Agent */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-4">
              <h4 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                Ações Rápidas por Membro
              </h4>
              <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                {teamAgents.map((agent) => {
                  const hasWeekendViolation = checkWeekendViolation(agent);
                  const activeDaysCount = Object.keys(agent.schedules).filter((day) => {
                    return Object.values(agent.schedules[day as Day]!.intervals).some(
                      (s) => s === "trabalhando" || s === "externo" || s === "pausa",
                    );
                  }).length;

                  return (
                    <div
                      key={agent.id}
                      className={`p-3.5 border rounded-xl bg-card shadow-sm hover:shadow transition-all space-y-3 text-xs ${!agent.active ? "border-destructive/20 bg-destructive/5 opacity-60" : "border-border/80"}`}
                    >
                      <div className="flex items-center justify-between font-bold border-b border-border/40 pb-2">
                        <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                          {editingAgentId === agent.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (editingNameValue.trim()) {
                                  updateTeamAgentName(agent.id, editingNameValue.trim());
                                  setEditingAgentId(null);
                                }
                              }}
                              className="flex items-center gap-1.5 flex-1"
                            >
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                className="bg-background border border-primary px-1.5 py-0.5 text-xs focus:outline-none w-full font-bold"
                                autoFocus
                                required
                              />
                              <button
                                type="submit"
                                className="text-emerald-600 hover:text-emerald-500 p-0.5 shrink-0"
                                title="Salvar"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAgentId(null)}
                                className="text-rose-600 hover:text-rose-500 p-0.5 shrink-0"
                                title="Cancelar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-1.5 group flex-1 min-w-0">
                              <span
                                className={`truncate max-w-[150px] ${!agent.active ? "line-through opacity-50 font-normal text-muted-foreground" : "text-foreground"}`}
                              >
                                {agent.name}
                              </span>
                              {agent.active && (
                                <button
                                  onClick={() => {
                                    setEditingAgentId(agent.id);
                                    setEditingNameValue(agent.name);
                                  }}
                                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5 shrink-0"
                                  title="Editar nome"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                          {!agent.active && (
                            <span className="text-[8px] bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                              Inativo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleAgentActive(agent.id)}
                            className={`text-[9px] font-bold px-2.5 py-1 border uppercase transition-all rounded-md tracking-wider ${
                              agent.active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-900/30"
                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/30"
                            }`}
                            title={agent.active ? "Inativar analista" : "Ativar analista"}
                          >
                            {agent.active ? "Inativar" : "Ativar"}
                          </button>
                          <button
                            onClick={() => removeTeamAgent(agent.id)}
                            className="text-destructive hover:bg-destructive/10 hover:border-destructive/20 border border-transparent p-1.5 rounded-md transition-colors shrink-0"
                            title="Remover analista"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                        <span>Carga Horária ({activeDay}):</span>
                        <span className="font-semibold text-foreground">
                          {getAgentWorkedHours(agent, activeDay).toFixed(1)}h / dia
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`text-[9px] px-2 py-0.5 font-semibold rounded-md border tracking-wide ${
                            activeDaysCount === 5
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                          }`}
                        >
                          {activeDaysCount} Dias Trabalhados
                        </span>

                        {hasWeekendViolation && (
                          <span className="text-[9px] px-2 py-0.5 font-bold rounded-md border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900 animate-pulse flex items-center gap-1 shrink-0">
                            <ShieldAlert className="h-2.5 w-2.5" /> FIM DE SEMANA CONSECUTIVO 🚨
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleClearAgentDay(agent.id)}
                        className="w-full text-center py-1.5 text-xs font-semibold rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/20 transition-all font-medium"
                      >
                        Marcar Folga Geral ({activeDay})
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
