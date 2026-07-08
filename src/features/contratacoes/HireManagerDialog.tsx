import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Calculator, Wand2, Pencil, Trash, Plus } from "lucide-react";
import { useHireManager } from "./useHireManager";
import { DAYS, Day } from "@/context/DimensionamentoContext";

type Props = {
  isManagerOpen: boolean;
  setIsManagerOpen: (open: boolean) => void;
  aiLoading: boolean;
  onMathSuggest: () => void;
  onAiSuggest: () => void;
};

export function HireManagerDialog({
  isManagerOpen,
  setIsManagerOpen,
  aiLoading,
  onMathSuggest,
  onAiSuggest,
}: Props) {
  const manager = useHireManager();

  // Ensure modal state syncs
  if (manager.isManagerOpen !== isManagerOpen) {
    manager.setIsManagerOpen(isManagerOpen);
  }

  const handleOpenChange = (open: boolean) => {
    setIsManagerOpen(open);
    manager.setIsManagerOpen(open);
  };

  const formatDaysAndOffs = (workDays: Day[]) => {
    const shortDaysMap: Record<Day, string> = {
      Segunda: "Seg",
      Terça: "Ter",
      Quarta: "Qua",
      Quinta: "Qui",
      Sexta: "Sex",
      Sábado: "Sáb",
      Domingo: "Dom",
    };

    const workingShort = workDays.map((d) => shortDaysMap[d]).join(", ");
    const offDays = DAYS.filter((d) => !workDays.includes(d));
    const offShort = offDays.map((d) => shortDaysMap[d]).join(", ");

    return {
      working: workingShort,
      offs: offShort || "Nenhuma",
    };
  };

  return (
    <Dialog open={isManagerOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl flex flex-wrap items-center justify-between gap-4">
            <span>Contratações Ativas</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onMathSuggest}
                disabled={aiLoading || manager.isReadOnly}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Calculator className="h-3.5 w-3.5" />
                )}
                {aiLoading ? "Calculando…" : "Otimização Matemática"}
              </button>
              <button
                type="button"
                onClick={onAiSuggest}
                disabled={aiLoading || manager.isReadOnly}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {aiLoading ? "Gerando…" : "Sugerir com IA"}
              </button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Ative, remova ou insira novos agentes simulados manualmente abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hires list */}
          <div className="space-y-2">
            {manager.newHires.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-xl">
                Nenhum agente simulado no momento. <br /> Use o formulário ou a sugestão IA.
              </div>
            )}
            {manager.newHires.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-3 border rounded-xl bg-muted/20 text-sm"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground">{h.name}</span>
                  <div className="text-xs text-muted-foreground leading-normal">
                    <div>
                      {h.start_time} - {h.end_time}{" "}
                      {h.lunch_start_time ? `(Almoço: ${h.lunch_start_time})` : ""} ·{" "}
                      {h.days.length} dias
                    </div>
                    <div className="text-[11px] text-muted-foreground/75 mt-0.5">
                      Trab:{" "}
                      <span className="text-foreground">{formatDaysAndOffs(h.days).working}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/75">
                      Folga:{" "}
                      <span className="text-foreground">{formatDaysAndOffs(h.days).offs}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={h.active}
                    disabled={manager.isReadOnly}
                    onChange={() => manager.toggleHire(h.id)}
                    className="rounded border bg-background accent-primary h-4 w-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Ativar/Desativar na simulação"
                  />
                  <button
                    onClick={() => manager.handleEditHire(h)}
                    disabled={manager.isReadOnly}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => manager.handleRemoveHire(h.id)}
                    disabled={manager.isReadOnly}
                    className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remover"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add hire form */}
          <form onSubmit={manager.handleAddHire} className="space-y-4 pt-6 border-t">
            <h4 className="font-semibold text-card-foreground">
              {manager.editingHireId ? "Editar Agente" : "Adicionar Agente Manual"}
            </h4>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground uppercase text-xs">
                Nome do Agente
              </label>
              <input
                type="text"
                required
                value={manager.newHireName}
                disabled={manager.isReadOnly}
                onChange={(e) => manager.setNewHireName(e.target.value)}
                placeholder="Ex: Agente Contratado 5"
                className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase text-xs">
                  Entrada
                </label>
                <select
                  required
                  value={manager.newHireStart}
                  disabled={manager.isReadOnly}
                  onChange={(e) => manager.handleStartChange(e.target.value)}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const h = 7 + i;
                    const time = `${h.toString().padStart(2, "0")}:00`;
                    return (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase text-xs">
                  Saída (CLT)
                </label>
                <input
                  type="text"
                  required
                  readOnly
                  value={manager.newHireEnd}
                  disabled={manager.isReadOnly}
                  onChange={(e) => manager.setNewHireEnd(e.target.value)}
                  placeholder="18:00"
                  className="w-full bg-muted border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground uppercase text-xs">
                Início do Almoço
              </label>
              <select
                value={manager.newHireLunch}
                disabled={manager.isReadOnly}
                onChange={(e) => manager.setNewHireLunch(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Sem Almoço</option>
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = (8 + i) % 24;
                  const time = `${h.toString().padStart(2, "0")}:00`;
                  return (
                    <option key={time} value={time}>
                      {time} às {((h + 1) % 24).toString().padStart(2, "0")}:00
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground uppercase text-xs">
                Dias de Trabalho
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const selected = manager.newHireDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={manager.isReadOnly}
                      onClick={() => manager.handleToggleDaySelection(day)}
                      className={`px-3 py-1.5 rounded-md border text-xs transition-all ${
                        selected
                          ? "bg-primary border-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted border-border"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              {manager.editingHireId && (
                <button
                  type="button"
                  onClick={() => {
                    manager.setEditingHireId(null);
                    manager.setNewHireName("");
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border bg-background py-2.5 text-sm font-medium hover:bg-muted transition-all cursor-pointer text-foreground"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={manager.isReadOnly}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border bg-background py-2.5 text-sm font-medium hover:bg-accent transition-all cursor-pointer text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {manager.editingHireId ? (
                  "Salvar Alterações"
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Adicionar na Simulação
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
