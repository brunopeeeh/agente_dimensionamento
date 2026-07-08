import {
  Calendar,
  Check,
  CheckCircle,
  Edit2,
  ShieldAlert,
  SlidersHorizontal,
  Trash,
  X,
  RotateCcw,
  Users,
} from "lucide-react";
import { DAYS, Day, TeamAgent } from "@/context/DimensionamentoContext";
import { SHIFT_PRESETS, generateLunchOptions } from "./constants";
import { checkWeekendViolation, countActiveDays, getAgentWorkedHours } from "./helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  onResetAll: () => void;
  newAgentName: string;
  onNewAgentNameChange: (name: string) => void;
  onAddAgent: (e: React.FormEvent) => void;
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
  onResetAll,
  newAgentName,
  onNewAgentNameChange,
  onAddAgent,
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
        className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-card/95 backdrop-blur-md border-l border-border z-50 shadow-2xl flex flex-col transform transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-5 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> Configurações da Equipe
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Adicione analistas, altere horários e restaure padrões.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 border border-transparent hover:border-border transition-all rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successMessage && (
          <div className="bg-emerald-50 text-emerald-800 border-y border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 p-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <Tabs defaultValue="construtor" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="construtor" className="text-xs">
                Construtor
              </TabsTrigger>
              <TabsTrigger value="equipe" className="text-xs">
                Ações Rápidas
              </TabsTrigger>
              <TabsTrigger value="gerais" className="text-xs">
                Gerais
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <TabsContent value="construtor" className="mt-0 h-full animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Selecione o Analista
                    </label>
                    <select
                      value={selectedAgentForPreset}
                      onChange={(e) => onSelectedAgentForPresetChange(e.target.value)}
                      className="w-full bg-background border border-border text-sm px-3 py-2 focus:outline-none focus:border-primary font-bold rounded-md"
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
                    <div className="rounded-lg border border-border bg-background/50 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" /> Escala Vigente -{" "}
                        {selectedAgent.name.split(" ")[0]}
                      </h4>
                      <div className="grid grid-cols-1 gap-1.5 text-xs">
                        {DAYS.map((day) => {
                          const summary = getAgentDaySummary(selectedAgent, day);
                          const isFolga = summary === "Folga";
                          return (
                            <div
                              key={day}
                              className="flex justify-between items-center py-0.5 border-b border-border/10 last:border-0"
                            >
                              <span className="font-semibold text-muted-foreground w-16">
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
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Selecione os Dias
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map((day) => {
                        const isChecked = selectedDays[day];
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              onSelectedDaysChange((prev) => ({ ...prev, [day]: !prev[day] }))
                            }
                            className={`px-2.5 py-1 text-xs font-bold border transition-all rounded-md ${
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
                    <div className="flex gap-3 pt-1">
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
                        className="text-xs text-primary hover:underline font-bold"
                      >
                        Seg a Sex
                      </button>
                      <span className="text-xs text-muted-foreground/30">|</span>
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
                        className="text-xs text-primary hover:underline font-bold"
                      >
                        Todos
                      </button>
                      <span className="text-xs text-muted-foreground/30">|</span>
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
                        className="text-xs text-muted-foreground hover:underline font-bold"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Turno de Trabalho (9h)
                    </label>
                    <select
                      value={selectedShiftIndex}
                      onChange={(e) => onSelectedShiftIndexChange(Number(e.target.value))}
                      className="w-full bg-background border border-border text-sm px-3 py-2 focus:outline-none focus:border-primary font-mono font-bold rounded-md"
                    >
                      {SHIFT_PRESETS.map((p, idx) => (
                        <option key={p.label} value={idx}>
                          {p.start} às {p.end}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Horário de Almoço (1h)
                    </label>
                    <select
                      value={selectedLunchTime}
                      onChange={(e) => onSelectedLunchTimeChange(e.target.value)}
                      className="w-full bg-background border border-border text-sm px-3 py-2 focus:outline-none focus:border-primary font-mono font-bold rounded-md"
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

                  <div className="space-y-3 p-3 border border-border bg-muted/20 rounded-lg">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                        Demanda Externa (Opcional)
                      </label>
                      <select
                        value={selectedExternalTime}
                        onChange={(e) => onSelectedExternalTimeChange(e.target.value)}
                        className="w-full bg-background border border-border text-sm px-3 py-2 focus:outline-none focus:border-primary font-mono font-bold rounded-md"
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
                        <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                          Duração
                        </label>
                        <select
                          value={selectedExternalDuration}
                          onChange={(e) => onSelectedExternalDurationChange(Number(e.target.value))}
                          className="w-full bg-background border border-border text-sm px-3 py-2 focus:outline-none focus:border-primary font-bold rounded-md"
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
                      disabled={
                        !selectedAgentForPreset || !Object.values(selectedDays).some(Boolean)
                      }
                      className="flex-1 bg-primary text-primary-foreground text-sm font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-sm"
                    >
                      Aplicar Escala
                    </button>
                    <button
                      onClick={onApplyFolga}
                      disabled={
                        !selectedAgentForPreset || !Object.values(selectedDays).some(Boolean)
                      }
                      className="border border-destructive text-destructive hover:bg-destructive/10 text-sm font-bold px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                    >
                      Folga
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="equipe" className="mt-0 h-full animate-in fade-in duration-300">
              <div className="space-y-3">
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
                                className="bg-background border border-primary px-1.5 py-0.5 text-xs focus:outline-none w-full font-bold rounded"
                                autoFocus
                                required
                              />
                              <button
                                type="submit"
                                className="text-emerald-600 hover:text-emerald-500 p-0.5 shrink-0"
                                title="Salvar"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditingAgentIdChange(null)}
                                className="text-rose-600 hover:text-rose-500 p-0.5 shrink-0"
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
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
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {!agent.active && (
                            <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
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
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
                        <span>Carga Horária ({activeDay}):</span>
                        <span className="font-semibold text-foreground">
                          {getAgentWorkedHours(agent, activeDay).toFixed(1)}h / dia
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 font-semibold rounded-md border tracking-wide ${
                            activeDaysCount === 5
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                          }`}
                        >
                          {activeDaysCount} Dias Trabalhados
                        </span>

                        {hasWeekendViolation && (
                          <span className="text-[10px] px-2 py-0.5 font-bold rounded-md border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900 animate-pulse flex items-center gap-1 shrink-0">
                            <ShieldAlert className="h-3 w-3" /> FIM DE SEMANA CONSECUTIVO 🚨
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onClearAgentDay(agent.id)}
                        className="w-full text-center py-2 text-xs font-bold rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/20 transition-all"
                      >
                        Marcar Folga Geral ({activeDay})
                      </button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent
              value="gerais"
              className="mt-0 h-full animate-in fade-in duration-300 space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold tracking-wider uppercase text-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" /> Novo Analista
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Adicione um novo membro à equipe manualmente.
                  </p>
                </div>

                <form onSubmit={onAddAgent} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newAgentName}
                    onChange={(e) => onNewAgentNameChange(e.target.value)}
                    placeholder="Nome do novo analista..."
                    className="bg-background border border-border text-sm px-3 py-2 focus:outline-none focus:border-primary w-full rounded-md"
                  />
                  <button
                    type="submit"
                    title="Adicionar Analista"
                    className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2 hover:bg-primary/90 transition-all shrink-0 rounded-md shadow-sm"
                  >
                    Adicionar
                  </button>
                </form>
              </div>

              <hr className="border-border" />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold tracking-wider uppercase text-foreground flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4 text-primary" /> Restaurar
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Isso apagará todas as edições do mês e restaurará os agentes e volumes
                    originais.
                  </p>
                </div>

                <button
                  onClick={onResetAll}
                  className="w-full inline-flex justify-center items-center gap-2 border border-destructive bg-destructive/5 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive hover:text-white transition-all rounded-md"
                >
                  <RotateCcw className="h-4 w-4" /> Restaurar Originais
                </button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
}
