import {
  CalendarRange,
  TrendingUp,
  Bot,
  Users,
  Coffee,
  UserMinus,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { monthNames, formatDecimal } from "../engine";
import type { MonthPoint, PlannerInputs } from "../engine";
import type { PrefillSourceMap } from "../derivePlannerDefaults";
import { CollapsibleSection } from "./CollapsibleSection";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";

const MONTH_OPTIONS = monthNames.map((name, i) => ({
  value: String(i + 1),
  label: name,
}));

type Props = {
  inputs: PlannerInputs;
  sources: PrefillSourceMap;
  timeline: MonthPoint[];
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  patchPercent: (key: keyof PlannerInputs, value: number) => void;
  toggleTurnoverMonth: (monthKey: string) => void;
  inferredContactRate: number;
  contactRateDriftPct: number;
  isReadOnly: boolean;
};

export function InputsPanel({
  inputs,
  sources,
  timeline,
  patch,
  patchPercent,
  toggleTurnoverMonth,
  inferredContactRate,
  contactRateDriftPct,
  isReadOnly,
}: Props) {
  const showDriftWarning = inferredContactRate > 0 && contactRateDriftPct > 20;

  return (
    <div className="space-y-3">
      <CollapsibleSection title="Período" icon={CalendarRange} defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Mês inicial"
            value={String(inputs.startMonth)}
            onChange={(v) => patch("startMonth", Number(v))}
            options={MONTH_OPTIONS}
            disabled={isReadOnly}
          />
          <NumberField
            label="Ano inicial"
            value={inputs.startYear}
            onChange={(v) => patch("startYear", v)}
            min={2024}
            max={2040}
            plain
            source={sources.startYear}
            disabled={isReadOnly}
          />
          <SelectField
            label="Mês final"
            value={String(inputs.endMonth)}
            onChange={(v) => patch("endMonth", Number(v))}
            options={MONTH_OPTIONS}
            disabled={isReadOnly}
          />
          <NumberField
            label="Ano final"
            value={inputs.endYear}
            onChange={(v) => patch("endYear", v)}
            min={2024}
            max={2040}
            plain
            disabled={isReadOnly}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Projeção limitada a 24 meses a partir do mês inicial.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Demanda" icon={TrendingUp} defaultOpen>
        <NumberField
          label="Clientes atuais"
          value={inputs.currentClients}
          onChange={(v) => patch("currentClients", v)}
          min={0}
          source={sources.currentClients}
          disabled={isReadOnly}
        />
        <NumberField
          label="Meta de clientes (fim do período)"
          value={inputs.targetClientsQ4}
          onChange={(v) => patch("targetClientsQ4", v)}
          min={0}
          source={sources.targetClientsQ4}
          hint="Hipótese de crescimento — ajuste conforme a meta do ano."
          disabled={isReadOnly}
        />
        <NumberField
          label="Volume mensal de chamados"
          value={inputs.currentVolume}
          onChange={(v) => patch("currentVolume", v)}
          min={0}
          source={sources.currentVolume}
          hint="Estimado do grid semanal × 4,33 semanas/mês."
          disabled={isReadOnly}
        />
        <NumberField
          label="Contact rate (chamados/cliente/mês)"
          value={inputs.contactRate}
          onChange={(v) => patch("contactRate", v)}
          format="decimal"
          step={0.01}
          min={0}
          source={sources.contactRate}
          hint="Se 0, a taxa é inferida de volume ÷ clientes."
          disabled={isReadOnly}
        />
        {showDriftWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              O contact rate informado difere {formatDecimal(contactRateDriftPct, 0)}% da taxa
              inferida dos seus dados ({formatDecimal(inferredContactRate, 2)}). Confirme a unidade
              antes de confiar na projeção.
            </span>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="IA & Automação" icon={Bot}>
        <NumberField
          label="Cobertura de IA hoje"
          value={inputs.aiCoveragePct}
          onChange={(v) => patchPercent("aiCoveragePct", v)}
          format="decimal"
          step={0.1}
          suffix="%"
          source={sources.aiCoveragePct}
          disabled={isReadOnly}
        />
        <NumberField
          label="Crescimento mensal da cobertura"
          value={inputs.aiGrowthMonthlyPct}
          onChange={(v) => patchPercent("aiGrowthMonthlyPct", v)}
          format="decimal"
          step={0.1}
          suffix="% a.m."
          disabled={isReadOnly}
        />
        <NumberField
          label="Automação extra"
          value={inputs.extraAutomationPct}
          onChange={(v) => patchPercent("extraAutomationPct", v)}
          format="decimal"
          step={0.1}
          suffix="%"
          hint="Deflexão adicional (bots, self-service). Teto total de 95%."
          disabled={isReadOnly}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Capacidade & Equipe" icon={Users}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="HC pleno"
            value={inputs.headcountPleno}
            onChange={(v) => patch("headcountPleno", v)}
            min={0}
            source={sources.headcountPleno}
            disabled={isReadOnly}
          />
          <NumberField
            label="HC em rampa"
            value={inputs.headcountNovo}
            onChange={(v) => patch("headcountNovo", v)}
            min={0}
            disabled={isReadOnly}
          />
        </div>
        <NumberField
          label="Produtividade base"
          value={inputs.productivityBase}
          onChange={(v) => patch("productivityBase", v)}
          min={0}
          suffix="chamados/mês"
          source={sources.productivityBase}
          disabled={isReadOnly}
        />
        <NumberField
          label="Meses de rampa (novatos)"
          value={inputs.rampUpMonths}
          onChange={(v) => patch("rampUpMonths", v)}
          min={1}
          max={6}
          disabled={isReadOnly}
        />
        <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={inputs.useN1N2Split}
            onChange={(e) => patch("useN1N2Split", e.target.checked)}
            disabled={isReadOnly}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          Ajustar capacidade pelo mix N1/N2 (TMA)
        </label>
        {inputs.useN1N2Split && (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="TMA N1"
              value={inputs.tmaN1}
              onChange={(v) => patch("tmaN1", v)}
              min={1}
              suffix="min"
              disabled={isReadOnly}
            />
            <NumberField
              label="TMA N2"
              value={inputs.tmaN2}
              onChange={(v) => patch("tmaN2", v)}
              min={1}
              suffix="min"
              disabled={isReadOnly}
            />
            <NumberField
              label="Mix N1"
              value={inputs.mixN1Pct}
              onChange={(v) => {
                patchPercent("mixN1Pct", v);
                patchPercent("mixN2Pct", 100 - v);
              }}
              suffix="%"
              disabled={isReadOnly}
            />
            <NumberField
              label="Mix N2"
              value={inputs.mixN2Pct}
              onChange={(v) => {
                patchPercent("mixN2Pct", v);
                patchPercent("mixN1Pct", 100 - v);
              }}
              suffix="%"
              disabled={isReadOnly}
            />
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Shrinkage" icon={Coffee}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Pausas"
            value={inputs.breaksPct}
            onChange={(v) => patchPercent("breaksPct", v)}
            suffix="%"
            disabled={isReadOnly}
          />
          <NumberField
            label="Off-chat"
            value={inputs.offchatPct}
            onChange={(v) => patchPercent("offchatPct", v)}
            suffix="%"
            disabled={isReadOnly}
          />
          <NumberField
            label="Reuniões"
            value={inputs.meetingsPct}
            onChange={(v) => patchPercent("meetingsPct", v)}
            suffix="%"
            disabled={isReadOnly}
          />
          <NumberField
            label="Férias"
            value={inputs.vacationPct}
            onChange={(v) => patchPercent("vacationPct", v)}
            suffix="%"
            disabled={isReadOnly}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Turnover" icon={UserMinus}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Valor"
            value={inputs.turnoverValue}
            onChange={(v) => patch("turnoverValue", v)}
            format="decimal"
            step={0.1}
            min={0}
            suffix={inputs.turnoverInputMode === "percentual" ? "%" : "pessoas"}
            source={sources.turnoverValue}
            disabled={isReadOnly}
          />
          <SelectField
            label="Período"
            value={inputs.turnoverPeriod}
            onChange={(v) => patch("turnoverPeriod", v)}
            options={[
              { value: "mensal", label: "Mensal" },
              { value: "trimestral", label: "Trimestral" },
              { value: "semestral", label: "Semestral" },
              { value: "anual", label: "Anual" },
            ]}
            disabled={isReadOnly}
          />
          <SelectField
            label="Modo"
            value={inputs.turnoverInputMode}
            onChange={(v) => patch("turnoverInputMode", v)}
            options={[
              { value: "percentual", label: "Percentual" },
              { value: "absoluto", label: "Absoluto" },
            ]}
            disabled={isReadOnly}
          />
          <SelectField
            label="Aplicação"
            value={inputs.turnoverTiming}
            onChange={(v) => patch("turnoverTiming", v)}
            options={[
              { value: "end_of_month", label: "Fim do mês" },
              { value: "start_of_month", label: "Início do mês" },
            ]}
            disabled={isReadOnly}
          />
        </div>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground">
            Meses com desligamento
          </span>
          <p className="mb-1.5 text-[10px] text-muted-foreground">
            Nenhum selecionado = turnover em todos os meses.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {timeline.map((m) => {
              const selected = inputs.turnoverMonths.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleTurnoverMonth(m.key)}
                  disabled={isReadOnly}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Contratação" icon={Briefcase}>
        <NumberField
          label="Lead time de contratação"
          value={inputs.leadTimeMonths}
          onChange={(v) => patch("leadTimeMonths", v)}
          min={0}
          max={6}
          suffix="meses"
          hint="Tempo entre abrir a vaga e a pessoa começar."
          disabled={isReadOnly}
        />
        <SelectField
          label="Modo de contratação"
          value={inputs.hiringMode}
          onChange={(v) => patch("hiringMode", v)}
          options={[
            { value: "antecipado", label: "Antecipado (cobre a rampa)" },
            { value: "gap", label: "Reativo (contrata no gap)" },
          ]}
          disabled={isReadOnly}
        />
      </CollapsibleSection>
    </div>
  );
}
