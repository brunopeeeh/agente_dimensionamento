import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDimensionamento, DAYS, Day, NewAgentHire } from "@/context/DimensionamentoContext";
import { TimeGridSheet } from "@/components/TimeGridSheet";
import { aiAgentsToNewHires, buildDeficitTable, type AiAgentSuggestion } from "@/lib/ai-suggestion";
import { getDefaultLunchTime } from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Wand2,
  Trash,
  Plus,
  Loader2,
  Sparkles,
  Check,
  AlertTriangle,
  Settings2,
  Calculator,
} from "lucide-react";

export const Route = createLazyFileRoute("/contratacoes")({
  component: ContratacoesComponent,
});

function ContratacoesComponent() {
  const { currentMonth, rowCalculations, newHires, setNewHires } = useDimensionamento();

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

  // Local state for simulator creation
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [newHireName, setNewHireName] = useState("");
  const [newHireStart, setNewHireStart] = useState("09:00");
  const [newHireEnd, setNewHireEnd] = useState("18:00");
  const [newHireLunch, setNewHireLunch] = useState("13:00");
  const [newHireDays, setNewHireDays] = useState<Day[]>([
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
  ]);

  const handleStartChange = (val: string) => {
    setNewHireStart(val);
    setNewHireLunch(getDefaultLunchTime(val));
  };

  // AI suggestion state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAgents, setAiAgents] = useState<AiAgentSuggestion[]>([]);
  const [aiJustification, setAiJustification] = useState("");
  const [aiValidationErrors, setAiValidationErrors] = useState<
    { rule: number; agent?: string; message: string }[]
  >([]);
  const [aiMeta, setAiMeta] = useState<{
    cached: boolean;
    attempts: number;
    model: string;
  } | null>(null);
  const [aiResult, setAiResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleAiSuggest = async () => {
    if (!currentMonth) {
      toast.error("Selecione um mês antes de gerar sugestão.");
      return;
    }
    const table = buildDeficitTable(rowCalculations);
    if (table.length === 0) {
      toast.info("Sem defasagens detectadas na escala atual — IA não precisa agir.");
      return;
    }
    setAiLoading(true);
    const loadingId = toast.loading(`Gerando sugestão IA (${currentMonth})…`);
    try {
      const res = await fetch("/api/ai-suggestion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          deficitTable: table,
          skipCache: true,
        }),
      });
      const data = (await res.json()) as {
        success: boolean;
        message: string;
        cached: boolean;
        attempts: number;
        agents: AiAgentSuggestion[];
        justification?: string;
        validationErrors?: { rule: number; agent?: string; message: string }[];
        model: string;
      };
      setAiAgents(data.agents);
      setAiJustification(data.justification ?? "");
      setAiValidationErrors(data.validationErrors ?? []);
      setAiMeta({ cached: data.cached, attempts: data.attempts, model: data.model });
      setAiResult({ success: data.success, message: data.message });
      setAiDialogOpen(true);
      if (data.success) {
        toast.success(data.message, { id: loadingId });
      } else {
        toast.warning(data.message, { id: loadingId });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha ao gerar sugestão: ${message}`, { id: loadingId });
    } finally {
      setAiLoading(false);
    }
  };

  const handleMathSuggest = async () => {
    if (!currentMonth) {
      toast.error("Selecione um mês antes de gerar otimização.");
      return;
    }
    const table = buildDeficitTable(rowCalculations);
    if (table.length === 0) {
      toast.info("Sem defasagens detectadas na escala atual.");
      return;
    }
    setAiLoading(true);
    const loadingId = toast.loading(`Calculando Matemática Perfeita (${currentMonth})…`);
    try {
      const res = await fetch("/api/math-suggestion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          deficitTable: table,
        }),
      });
      const data = (await res.json()) as {
        success: boolean;
        message: string;
        cached: boolean;
        attempts: number;
        agents: AiAgentSuggestion[];
        justification?: string;
        model: string;
      };
      setAiAgents(data.agents);
      setAiJustification(data.justification ?? "");
      setAiValidationErrors([]); // Math solver mathematically guarantees 0 validation errors
      setAiMeta({ cached: data.cached, attempts: data.attempts, model: data.model });
      setAiResult({ success: data.success, message: data.message });
      setAiDialogOpen(true);
      if (data.success) {
        toast.success(data.message, { id: loadingId });
      } else {
        toast.warning(data.message, { id: loadingId });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha ao otimizar: ${message}`, { id: loadingId });
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    const hires = aiAgentsToNewHires(aiAgents);
    if (hires.length === 0) {
      toast.error("Nenhum agente válido para aplicar.");
      return;
    }
    setNewHires([...newHires, ...hires]);
    toast.success(
      `${hires.length} agente(s) adicionado(s) à simulação. Ajuste conforme necessário.`,
    );
    setAiDialogOpen(false);
  };

  const handleAddHire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHireName) return;
    const newAgent: NewAgentHire = {
      id: "h_" + Date.now(),
      name: newHireName,
      start_time: newHireStart,
      end_time: newHireEnd,
      days: newHireDays,
      lunch_start_time: newHireLunch || undefined,
      active: true,
    };
    setNewHires((prev) => [...prev, newAgent]);
    setNewHireName("");
  };

  const handleRemoveHire = (id: string) => {
    setNewHires((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleHire = (id: string) => {
    setNewHires((prev) => prev.map((h) => (h.id === id ? { ...h, active: !h.active } : h)));
  };

  const handleToggleDaySelection = (day: Day) => {
    setNewHireDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {currentMonth} · Simulador
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl text-foreground">
            Simular Escala - Prova Real
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simule a contratação e horários de novos agentes para visualizar em tempo real a cobertura dos déficits.
          </p>
        </div>
        <button
          onClick={() => setIsManagerOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Settings2 className="h-4 w-4" />
          Gerenciar Contratações
          {newHires.length > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
              {newHires.length}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {/* Full width TimeGridSheet */}
        <TimeGridSheet
          mode="provaReal"
          title="Volume × Capacity - Prova Real (Simulado)"
          subtitle="O capacity reflete a escala CLT atual somada às contratações ativas."
        />
      </div>

      {/* Manager Modal */}
      <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl flex flex-wrap items-center justify-between gap-4">
              <span>Contratações Ativas</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleMathSuggest}
                  disabled={aiLoading}
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
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
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
              {newHires.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-xl">
                  Nenhum agente simulado no momento. <br /> Use o formulário ou a sugestão IA.
                </div>
              )}
              {newHires.map((h) => (
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
                        Trab: <span className="text-foreground">{formatDaysAndOffs(h.days).working}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground/75">
                        Folga: <span className="text-foreground">{formatDaysAndOffs(h.days).offs}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={h.active}
                      onChange={() => toggleHire(h.id)}
                      className="rounded border bg-background accent-primary h-4 w-4 cursor-pointer"
                      title="Ativar/Desativar na simulação"
                    />
                    <button
                      onClick={() => handleRemoveHire(h.id)}
                      className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-all"
                      title="Remover"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add hire form */}
            <form onSubmit={handleAddHire} className="space-y-4 pt-6 border-t">
              <h4 className="font-semibold text-card-foreground">Adicionar Agente Manual</h4>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase text-xs">
                  Nome do Agente
                </label>
                <input
                  type="text"
                  required
                  value={newHireName}
                  onChange={(e) => setNewHireName(e.target.value)}
                  placeholder="Ex: Agente Contratado 5"
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase text-xs">
                    Entrada
                  </label>
                  <input
                    type="text"
                    required
                    value={newHireStart}
                    onChange={(e) => handleStartChange(e.target.value)}
                    placeholder="09:00"
                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground uppercase text-xs">
                    Saída (CLT)
                  </label>
                  <input
                    type="text"
                    required
                    value={newHireEnd}
                    onChange={(e) => setNewHireEnd(e.target.value)}
                    placeholder="18:00"
                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground uppercase text-xs">
                  Início do Almoço
                </label>
                <select
                  value={newHireLunch}
                  onChange={(e) => setNewHireLunch(e.target.value)}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="">Sem Almoço</option>
                  {Array.from({ length: 15 }).map((_, i) => {
                    const h = 8 + i;
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
                    const selected = newHireDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDaySelection(day)}
                        className={`px-3 py-1.5 rounded-md border text-xs transition-all ${
                          selected
                            ? "bg-primary border-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted border-border"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border bg-background py-2.5 text-sm font-medium hover:bg-accent transition-all cursor-pointer text-foreground"
              >
                <Plus className="h-4 w-4" /> Adicionar na Simulação
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {aiMeta?.model?.includes("math") ? (
                <Calculator className="h-4 w-4 text-blue-600 animate-pulse" />
              ) : (
                <Wand2 className="h-4 w-4 text-emerald-600 animate-pulse" />
              )}
              {aiMeta?.model?.includes("math") ? "Otimização Matemática · " : "Sugestão de IA · "}{currentMonth}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {aiMeta
                ? `${aiMeta.model} · ${aiMeta.cached ? "recuperado do cache" : `${aiMeta.attempts} tentativa(s)`}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {aiValidationErrors.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs space-y-1">
              <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Validação 5x2: {aiValidationErrors.length} aviso(s)
              </div>
              <ul className="list-disc pl-5 text-amber-700/90 dark:text-amber-400/90 space-y-0.5">
                {aiValidationErrors.slice(0, 5).map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      Regra {e.rule}
                      {e.agent ? ` · ${e.agent}` : ""}:
                    </span>{" "}
                    {e.message}
                  </li>
                ))}
                {aiValidationErrors.length > 5 && (
                  <li className="text-muted-foreground">
                    +{aiValidationErrors.length - 5} aviso(s)…
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {aiAgents.length === 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />A IA respondeu, mas nenhum agente
                  válido foi gerado
                </div>
                {aiResult?.message && (
                  <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                    {aiResult.message}
                  </p>
                )}
                <p className="text-muted-foreground leading-relaxed">
                  Isso costuma ocorrer quando o modelo não devolve um JSON válido ou viola as regras
                  da escala 5x2. Tente gerar novamente; se persistir, ajuste o modelo em{" "}
                  <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">
                    OPENROUTER_MODEL
                  </code>{" "}
                  ou revise a tabela de defasagens.
                </p>
              </div>
            )}
            {aiAgents.map((a, i) => (
               <div
                key={i}
                className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 text-sm border-border"
              >
                <span className="font-semibold text-foreground">{a.agente}</span>
                <span className="text-muted-foreground">
                  {a.inicio}–{a.fim}
                </span>
                <div className="flex flex-wrap gap-1">
                  {a.dias_trabalho.map((d) => (
                    <span
                      key={d}
                      className="rounded-md border bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  folga: {a.folga.join("+")}
                </span>
              </div>
            ))}
          </div>

          {aiJustification && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-foreground">
                {aiMeta?.model?.includes("math") ? (
                  <Calculator className="h-4 w-4 text-blue-600 animate-pulse" />
                ) : (
                  <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
                )}
                {aiMeta?.model?.includes("math") ? "Detalhamento Matemático" : "Análise e Justificativa da IA"}
              </h4>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1 border-border">
                {aiJustification}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setAiDialogOpen(false)}
              className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent border-border cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleApplyAiSuggestion}
              disabled={aiAgents.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Aplicar à Simulação
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
