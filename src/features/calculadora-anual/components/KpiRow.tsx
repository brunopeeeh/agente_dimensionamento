import type { ComponentType } from "react";
import { UserPlus, Users, Gauge, CalendarClock } from "lucide-react";
import { formatInt } from "../engine";
import type { ProjectionResult } from "../engine";

type Props = {
  projection: ProjectionResult;
};

export function KpiRow({ projection }: Props) {
  const { summary, rows } = projection;
  const riskCount = rows.filter((r) => r.risk !== "ok").length;
  const lastLabel = rows.length > 0 ? rows[rows.length - 1].month.label : "—";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={UserPlus}
        label="Contratações no período"
        value={formatInt(summary.hiresYear)}
        hint="Total de admissões projetadas"
        color="text-primary bg-primary/10"
      />
      <KpiCard
        icon={Users}
        label={`Agentes necessários (${lastLabel})`}
        value={formatInt(summary.agentsNeededQ4)}
        hint="Para cobrir o volume humano do último mês"
        color="text-indigo-600 bg-indigo-600/10 dark:text-indigo-400 dark:bg-indigo-400/10"
      />
      <KpiCard
        icon={Gauge}
        label="Capacidade por agente"
        value={formatInt(summary.capacityPerAgent)}
        hint="Chamados/mês após shrinkage e mix"
        color="text-sky-600 bg-sky-600/10 dark:text-sky-400 dark:bg-sky-400/10"
      />
      <KpiCard
        icon={CalendarClock}
        label="Primeira abertura crítica"
        value={summary.criticalOpenMonth || "—"}
        hint={
          riskCount > 0
            ? `${riskCount} ${riskCount === 1 ? "mês em risco" : "meses em risco"} no período`
            : "Nenhum mês em risco no período"
        }
        color="text-amber-600 bg-amber-600/10 dark:text-amber-400 dark:bg-amber-400/10"
        tone={riskCount > 0 ? "warn" : "good"}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  color?: string;
  tone?: "good" | "bad" | "warn" | "neutral";
}) {
  const valueColor =
    tone === "good"
      ? "text-emerald-500 font-semibold"
      : tone === "bad"
        ? "text-rose-500 font-semibold"
        : tone === "warn"
          ? "text-amber-500 font-semibold"
          : "text-foreground";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm backdrop-blur border-border">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
