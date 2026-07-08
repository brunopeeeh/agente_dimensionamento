import { Briefcase, UserPlus } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { ProjectionResult } from "../engine";

type Props = {
  projection: ProjectionResult;
};

export function HiringTimeline({ projection }: Props) {
  const monthsWithAction = projection.rows.filter((r) => r.hiresOpened > 0 || r.hiresStarted > 0);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm border-border">
      <div className="mb-4 border-b border-border/40 pb-4">
        <h3 className="text-sm font-semibold text-foreground">Linha do tempo de contratação</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Quando abrir vagas e quando as pessoas começam, já considerando lead time e rampa.
        </p>
      </div>

      {monthsWithAction.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhuma contratação necessária no período projetado.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {projection.rows.map((row) => {
            const hasAction = row.hiresOpened > 0 || row.hiresStarted > 0;
            return (
              <div
                key={row.month.key}
                className={`flex min-w-[92px] shrink-0 flex-col gap-1.5 rounded-lg border p-2.5 text-center ${
                  hasAction ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {row.month.label}
                </span>
                {row.hiresOpened > 0 ? (
                  <Tooltip
                    content={`Abrir ${row.hiresOpened} vaga(s) agora para impacto pleno em ${row.targetImpactLabel}.`}
                  >
                    <span className="inline-flex items-center justify-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      <Briefcase className="h-3 w-3" /> abrir {row.hiresOpened}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                )}
                {row.hiresStarted > 0 ? (
                  <span className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <UserPlus className="h-3 w-3" /> entra {row.hiresStarted}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
