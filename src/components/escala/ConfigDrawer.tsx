import {
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Edit2,
  ShieldAlert,
  SlidersHorizontal,
  Trash,
  X,
} from "lucide-react";
import { DAYS, Day, TeamAgent } from "@/context/DimensionamentoContext";
import { SHIFT_PRESETS, generateLunchOptions } from "./constants";
import { checkWeekendViolation, countActiveDays, getAgentWorkedHours } from "./helpers";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  successMessage: string | null;
  teamAgents: TeamAgent[];
  timeBlocks20: string[];
  activeDay: Day;
  selectedAgentForPreset: string;
  onSelectedAgentForPresetChange: (id: string) => void;
  selectedDays: Record<Day, boolean>;
  onSelectedDaysChange: React.Dispatch<React.SetStateAction<Record<Day, boolean>>>;
  selectedShiftIndex: number;
  onSelectedShiftIndexChange: (index: number) => void;
  selectedLunchTime: string;
  onSelectedLunchTimeChange: (time: string) => void;
  selectedExternalTime: string;
  onSelectedExternalTimeChange: (time: string) => void;
  selectedExternalDuration: number;
  onSelectedExternalDurationChange: (minutes: number) => void;
  onApplyCustomShift: () => void;
  onApplyFolga: () => void;
  getAgentDaySummary: (agent: TeamAgent, day: Day) => string;
  editingAgentId: string | null;
  onEditingAgentIdChange: (id: string | null) => void;
  editingNameValue: string;
  onEditingNameValueChange: (name: string) => void;
  onUpdateTeamAgentName: (agentId: string, name: string) => void;
  onToggleAgentActive: (agentId: string) => void;
  onRemoveTeamAgent: (agentId: string) => void;
  onClearAgentDay: (agentId: string) => void;
};

export function ConfigDrawer({
  isOpen,
  onClose,
  successMessage,
  teamAgents,
  timeBlocks20,
  activeDay,
  selectedAgentForPreset,
  onSelectedAgentForPresetChange,
  selectedDays,
  onSelectedDaysChange,
  selectedShiftIndex,
  onSelectedShiftIndexChange,
  selectedLunchTime,
  onSelectedLunchTimeChange,
  selectedExternalTime,
  onSelectedExternalTimeChange,
  selectedExternalDuration,
  onSelectedExternalDurationChange,
  onApplyCustomShift,
  onApplyFolga,
  getAgentDaySummary,
  editingAgentId,
  onEditingAgentIdChange,
  editingNameValue,
  onEditingNameValueChange,
  onUpdateTeamAgentName,
  onToggleAgentActive,
  onRemoveTeamAgent,
  onClearAgentDay,
}: Props) {
  const lunchOptions = generateLunchOptions();
  const selectedAgent = teamAgents.find((a) => a.id === selectedAgentForPreset);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[5px] z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-card/95 backdrop-blur-md border-l border-border z-50 p-5 shadow-2xl flex flex-col justify-between transform transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
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
              onClick={onClose}
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
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-4">
              <h4 className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Construtor de Escala
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Configure turnos de 9 horas (8h úteis + 1h almoço) de forma extremamente fácil:
              </p>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground">
                    Selecione o Analista
                  </label>
                  <select
                    value={selectedAgentForPreset}
                    onChange={(e) => onSelectedAgentForPresetChange(e.target.value)}
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

                {selectedAgent && (
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
                            <span className="font-semibold text-muted-foreground w-12">{day}</span>
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
                )}

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
                            onSelectedDaysChange((prev) => ({ ...prev, [day]: !prev[day] }))
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
                        onSelectedDaysChange({
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
                        onSelectedDaysChange({
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
                        onSelectedDaysChange({
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

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground">
                    Turno de Trabalho
                  </label>
                  <select
                    value={selectedShiftIndex}
                    onChange={(e) => onSelectedShiftIndexChange(Number(e.target.value))}
                    className="w-full bg-background border border-border text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono font-bold"
                  >
                    {SHIFT_PRESETS.map((p, idx) => (
                      <option key={p.label} value={idx}>
                        {p.start} às {p.end}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground">
                    Horário de Início do Almoço / Jantar
                  </label>
                  <select
                    value={selectedLunchTime}
                    onChange={(e) => onSelectedLunchTimeChange(e.target.value)}
                    className="w-full bg-background border border-border text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono font-bold"
                  >
                    {lunchOptions.map((time) => {
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

                <div className="space-y-3 p-3 border border-border/85 bg-background/40 rounded-none">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground block">
                      Demanda Externa (Offchat) - Opcional
                    </label>
                    <select
                      value={selectedExternalTime}
                      onChange={(e) => onSelectedExternalTimeChange(e.target.value)}
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
                        onChange={(e) => onSelectedExternalDurationChange(Number(e.target.value))}
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
                    onClick={onApplyCustomShift}
                    disabled={!selectedAgentForPreset || !Object.values(selectedDays).some(Boolean)}
                    className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 hover:bg-primary/95 transition-all rounded-none disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Aplicar Escala
                  </button>
                  <button
                    onClick={onApplyFolga}
                    disabled={!selectedAgentForPreset || !Object.values(selectedDays).some(Boolean)}
                    className="border border-destructive text-destructive hover:bg-destructive/10 text-xs font-bold px-3 py-2 transition-all rounded-none disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                  >
                    Definir Folga
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-4">
              <h4 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                Ações Rápidas por Membro
              </h4>
              <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                {teamAgents.map((agent) => {
                  const hasWeekendViolation = checkWeekendViolation(agent);
                  const activeDaysCount = countActiveDays(agent);

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
                                  onUpdateTeamAgentName(agent.id, editingNameValue.trim());
                                  onEditingAgentIdChange(null);
                                }
                              }}
                              className="flex items-center gap-1.5 flex-1"
                            >
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => onEditingNameValueChange(e.target.value)}
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
                                onClick={() => onEditingAgentIdChange(null)}
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
                                    onEditingAgentIdChange(agent.id);
                                    onEditingNameValueChange(agent.name);
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
                            onClick={() => onToggleAgentActive(agent.id)}
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
                            onClick={() => onRemoveTeamAgent(agent.id)}
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
                        onClick={() => onClearAgentDay(agent.id)}
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
    </>
  );
}
