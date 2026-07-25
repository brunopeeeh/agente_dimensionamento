import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  UserMinus,
  Users,
  Wand2,
} from "lucide-react";
import { useDimensionamento, DAYS, type Day } from "@/context/DimensionamentoContext";
import { computeGridCalculations, computeDynamicTmaFactors } from "@/lib/calculations";
import { applyAbsence, applyVolumeSpike } from "@/lib/simulador";
import { buildDeficitTable } from "@/lib/ai-suggestion";
import { estimateAgentsNeeded } from "@/lib/optimization/solver";
import { useAiSuggestion } from "@/features/ai-suggestion/useAiSuggestion";
import { AiSuggestionDialog } from "@/features/ai-suggestion/AiSuggestionDialog";

export const Route = createLazyFileRoute("/simulador")({
  component: Simulador,
});

type SpikeChannel = "webchat" | "whatsapp" | "ambos";

function Simulador() {
  const {
    currentMonth,
    teamAgents,
    capacityAgents,
    timeBlocks,
    webchatVolumes,
    whatsappVolumes,
    simultaneousWC,
    simultaneousWA,
    newHires,
    rowCalculations,
    kpis,
  } = useDimensionamento();

  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [absenceDays, setAbsenceDays] = useState<Day[]>([]);
  const [spikePct, setSpikePct] = useState(0);
  const [spikeDays, setSpikeDays] = useState<Day[]>([]);
  const [spikeChannel, setSpikeChannel] = useState<SpikeChannel>("whatsapp");

  const hasSpike = spikePct !== 0 && spikeDays.length > 0;
  const hasSimulation = absentIds.length > 0 || hasSpike;

  // Recalcula a semana inteira com as perturbações aplicadas. Tudo em memória:
  // nada aqui toca o estado real nem a persistência do mês.
  const simulated = useMemo(() => {
    const simTeam = applyAbsence(teamAgents, new Set(absentIds), absenceDays);
    const simWC =
      spikeChannel === "whatsapp"
        ? webchatVolumes
        : applyVolumeSpike(webchatVolumes, spikeDays, spikePct);
    const simWA =
      spikeChannel === "webchat"
        ? whatsappVolumes
        : applyVolumeSpike(whatsappVolumes, spikeDays, spikePct);

    return computeGridCalculations({
      days: DAYS,
      timeBlocks,
      webchatVolumes: simWC,
      whatsappVolumes: simWA,
      teamAgents: simTeam,
      dynamicTmaFactors: computeDynamicTmaFactors(DAYS, simTeam, capacityAgents),
      simultaneousWC,
      simultaneousWA,
      newHires,
    });
  }, [
    teamAgents,
    absentIds,
    absenceDays,
    spikeChannel,
    spikeDays,
    spikePct,
    webchatVolumes,
    whatsappVolumes,
    timeBlocks,
    capacityAgents,
    simultaneousWC,
    simultaneousWA,
    newHires,
  ]);

  const baseAgents = useMemo(
    () => estimateAgentsNeeded({ deficitTable: buildDeficitTable(rowCalculations) }),
    [rowCalculations],
  );
  const simAgents = useMemo(
    () => estimateAgentsNeeded({ deficitTable: buildDeficitTable(simulated.rowCalculations) }),
    [simulated],
  );

  // Sugestão de turnos roda sobre o grid SIMULADO, não sobre o real.
  const aiState = useAiSuggestion(simulated.rowCalculations);

  const activeAgents = useMemo(() => teamAgents.filter((a) => a.active), [teamAgents]);

  const resetSimulation = () => {
    setAbsentIds([]);
    setAbsenceDays([]);
    setSpikePct(0);
    setSpikeDays([]);
  };

  const toggleAbsent = (id: string) =>
    setAbsentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex rounded-full border bg-background/60 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Cenários · {currentMonth}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Simulador de Cenários
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Teste ausências e picos de chamados sem alterar a escala real. Nada aqui é salvo.
            </p>
          </div>
          <button
            onClick={resetSimulation}
            disabled={!hasSimulation}
            className="self-start inline-flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpar cenário
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DeltaCard
            icon={AlertTriangle}
            label="Pico Máximo de Defasagem"
            base={kpis.picoMaximo.deficit}
            sim={simulated.kpis.picoMaximo.deficit}
            suffix=" agentes"
            hint={`${simulated.kpis.picoMaximo.day} às ${simulated.kpis.picoMaximo.time}`}
            higherIsWorse
            color="text-destructive bg-destructive/10"
          />
          <DeltaCard
            icon={CheckCircle2}
            label="Cobertura Semanal (SLA)"
            base={kpis.coberturaProjetada}
            sim={simulated.kpis.coberturaProjetada}
            suffix="%"
            decimals={1}
            hint="Fluxo total coberto pela equipe"
            color="text-success bg-success/10"
          />
          <DeltaCard
            icon={Users}
            label="Agentes Recomendados"
            base={baseAgents}
            sim={simAgents}
            hint="Estimativa para zerar a semana"
            higherIsWorse
            color="text-primary bg-primary/10"
          />
          <DeltaCard
            icon={TrendingUp}
            label="Déficit Total (10min)"
            base={kpis.totalDeficit10}
            sim={simulated.kpis.totalDeficit10}
            hint="Soma das lacunas na semana"
            higherIsWorse
            color="text-amber-600 bg-amber-600/10 dark:text-amber-400 dark:bg-amber-400/10"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          icon={UserMinus}
          title="Ausência de analistas"
          subtitle="Quem sai do time (mudança de setor) ou se ausenta, e em quais dias."
        >
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {activeAgents.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum analista ativo na escala.</p>
            )}
            {activeAgents.map((agent) => (
              <label
                key={agent.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={absentIds.includes(agent.id)}
                  onChange={() => toggleAbsent(agent.id)}
                  className="h-3.5 w-3.5 cursor-pointer accent-destructive"
                />
                <span className="truncate text-foreground">{agent.name}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 border-t border-border/40 pt-3">
            <FieldLabel>
              Dias da ausência
              <span className="ml-1.5 font-normal normal-case text-muted-foreground">
                (nenhum = semana toda)
              </span>
            </FieldLabel>
            <DayChips selected={absenceDays} onToggle={setAbsenceDays} />
          </div>
        </Panel>

        <Panel
          icon={TrendingUp}
          title="Pico de chamados"
          subtitle="Aumento (ou queda) percentual de volume nos dias selecionados."
        >
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <FieldLabel>Variação</FieldLabel>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={spikePct}
                  onChange={(e) => setSpikePct(Number(e.target.value) || 0)}
                  step={5}
                  className="w-24 rounded-md border bg-background px-2.5 py-1.5 text-sm tabular-nums text-foreground border-border"
                />
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <FieldLabel>Canal</FieldLabel>
              <select
                value={spikeChannel}
                onChange={(e) => setSpikeChannel(e.target.value as SpikeChannel)}
                className="rounded-md border bg-background px-2.5 py-1.5 text-sm text-foreground border-border"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="webchat">Webchat</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
          </div>

          <div className="mt-4 border-t border-border/40 pt-3">
            <FieldLabel>Dias afetados</FieldLabel>
            <DayChips selected={spikeDays} onToggle={setSpikeDays} />
            {spikePct !== 0 && spikeDays.length === 0 && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                Selecione ao menos um dia para o pico valer.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Como cobrir esse cenário</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {simAgents === 0
                ? "A equipe atual cobre o cenário simulado — nenhum reforço necessário."
                : `Faltam ${simAgents} agente(s) para zerar a semana simulada${
                    simAgents > baseAgents ? ` (${simAgents - baseAgents} a mais que hoje)` : ""
                  }.`}
            </p>
          </div>
          <button
            onClick={aiState.handleMathSuggest}
            disabled={aiState.aiLoading || simAgents === 0}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Wand2 className="h-4 w-4" />
            {aiState.aiLoading ? "Calculando…" : "Sugerir turnos"}
          </button>
        </div>
      </section>

      <AiSuggestionDialog
        isOpen={aiState.aiDialogOpen}
        onOpenChange={aiState.setAiDialogOpen}
        meta={aiState.aiMeta}
        currentMonth={currentMonth}
        validationErrors={aiState.aiValidationErrors}
        agents={aiState.aiAgents}
        result={aiState.aiResult}
        justification={aiState.aiJustification}
        onApply={() => {}}
        // Simulação é efêmera: aplicar gravaria em newHires (estado real).
        isReadOnly
      />
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm border-border">
      <div className="mb-4 border-b border-border/40 pb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function DayChips({ selected, onToggle }: { selected: Day[]; onToggle: (next: Day[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1 select-none">
      {DAYS.map((day) => {
        const isOn = selected.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onToggle(isOn ? selected.filter((d) => d !== day) : [...selected, day])}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-all ${
              isOn
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {day.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

function DeltaCard({
  icon: Icon,
  label,
  base,
  sim,
  suffix = "",
  decimals = 0,
  hint,
  higherIsWorse = false,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  base: number;
  sim: number;
  suffix?: string;
  decimals?: number;
  hint?: string;
  higherIsWorse?: boolean;
  color?: string;
}) {
  const diff = sim - base;
  const changed = Math.abs(diff) >= 0.05;
  const isWorse = higherIsWorse ? diff > 0 : diff < 0;
  const fmt = (n: number) => n.toFixed(decimals).replace(".", ",");

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm backdrop-blur border-border">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold tabular-nums ${
            changed ? (isWorse ? "text-rose-500" : "text-emerald-500") : "text-foreground"
          }`}
        >
          {fmt(sim)}
          {suffix}
        </span>
        {changed && (
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            de {fmt(base)}
            {suffix} ({diff > 0 ? "+" : ""}
            {fmt(diff)})
          </span>
        )}
      </div>

      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
