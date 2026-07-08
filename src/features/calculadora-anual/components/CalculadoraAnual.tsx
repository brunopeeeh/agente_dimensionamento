import { useState } from "react";
import { Loader2, RotateCcw, Settings2, Sparkles, X } from "lucide-react";
import { useDimensionamento } from "@/context/DimensionamentoContext";
import { useCalculadoraAnualState } from "../useCalculadoraAnualState";
import { useCalculadoraAnualPersistence } from "../useCalculadoraAnualPersistence";
import { useProjection } from "../useProjection";
import { InputsPanel } from "./InputsPanel";
import { KpiRow } from "./KpiRow";
import { ProjectionChart } from "./ProjectionChart";
import { HiringTimeline } from "./HiringTimeline";
import { MonthlyTable } from "./MonthlyTable";

export function CalculadoraAnual() {
  const isReadOnly = useDimensionamento((s) => s.isReadOnly);
  const state = useCalculadoraAnualState();
  const { saveStatus } = useCalculadoraAnualPersistence({
    snapshot: state.snapshot,
    enabled: state.hydrated,
    hydrate: state.hydrate,
  });
  const { projection, inferredContactRate, contactRateDriftPct } = useProjection(state.inputs);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!state.hydrated || state.contextLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando plano anual...
      </div>
    );
  }

  const inputsPanel = (
    <InputsPanel
      inputs={state.inputs}
      sources={state.sources}
      timeline={projection.timeline}
      patch={state.patch}
      patchPercent={state.patchPercent}
      toggleTurnoverMonth={state.toggleTurnoverMonth}
      inferredContactRate={inferredContactRate}
      contactRateDriftPct={contactRateDriftPct}
      isReadOnly={isReadOnly}
    />
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Planejamento Anual
              <SaveChip status={saveStatus} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Calculadora Anual de Headcount
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Projete demanda, capacidade e o timing de contratações para o período — a Prova Real
              resolve depois como encaixar na escala.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              onClick={state.applyPrefill}
              disabled={isReadOnly}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              title="Recalcular os inputs a partir dos dados reais da operação"
            >
              <Sparkles className="h-3.5 w-3.5" /> Repreencher com dados reais
            </button>
            <button
              onClick={state.restoreBase}
              disabled={isReadOnly}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              title="Restaurar o cenário base padrão"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 lg:hidden"
            >
              <Settings2 className="h-3.5 w-3.5" /> Parâmetros
            </button>
          </div>
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-6">
        <aside className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
          {inputsPanel}
        </aside>

        <div className="space-y-6">
          <KpiRow projection={projection} />
          <ProjectionChart projection={projection} />
          <HiringTimeline projection={projection} />
          <MonthlyTable projection={projection} />
        </div>
      </div>

      {/* Drawer mobile de parâmetros */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[5px] transition-opacity duration-300 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-300 ease-in-out sm:w-[420px] lg:hidden ${
          isDrawerOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Parâmetros da projeção</h2>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{inputsPanel}</div>
      </div>
    </div>
  );
}

function SaveChip({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  const styles = {
    saving: "text-muted-foreground",
    saved: "text-emerald-600 dark:text-emerald-400",
    error: "text-rose-600 dark:text-rose-400",
  } as const;
  const labels = { saving: "salvando…", saved: "salvo", error: "erro ao salvar" } as const;
  return <span className={`normal-case ${styles[status]}`}>{labels[status]}</span>;
}
