import { formatDecimal, formatInt } from "../engine";
import type { MonthlyProjection, ProjectionResult } from "../engine";

type Props = {
  projection: ProjectionResult;
};

const RISK_STYLES: Record<MonthlyProjection["risk"], { dot: string; label: string }> = {
  ok: { dot: "bg-emerald-500", label: "OK" },
  attention: { dot: "bg-amber-500", label: "Atenção" },
  critical: { dot: "bg-rose-500", label: "Crítico" },
};

export function MonthlyTable({ projection }: Props) {
  return (
    <div className="rounded-xl border bg-card shadow-sm border-border">
      <div className="border-b border-border/40 p-5 pb-4">
        <h3 className="text-sm font-semibold text-foreground">Projeção mês a mês</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Demanda, capacidade efetiva, gap e plano de abertura de vagas.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <Th>Mês</Th>
              <Th className="text-right">Clientes</Th>
              <Th className="text-right">Volume humano</Th>
              <Th className="text-right">Capacidade</Th>
              <Th className="text-right">HC efetivo</Th>
              <Th className="text-right">Gap (FTE)</Th>
              <Th className="text-right">Abrir vagas</Th>
              <Th className="text-right">Admissões</Th>
              <Th>Risco</Th>
            </tr>
          </thead>
          <tbody>
            {projection.rows.map((row) => {
              const risk = RISK_STYLES[row.risk];
              return (
                <tr
                  key={row.month.key}
                  className="border-b border-border/20 transition-colors hover:bg-accent/40"
                >
                  <Td className="font-medium text-foreground">{row.month.label}</Td>
                  <Td className="text-right tabular-nums">{formatInt(row.clientsBase)}</Td>
                  <Td className="text-right tabular-nums">{formatInt(row.volumeHuman)}</Td>
                  <Td className="text-right tabular-nums">
                    {formatInt(row.capacityAvailableTotal)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatDecimal(row.hcAvailableEffective, 1)}
                  </Td>
                  <Td
                    className={`text-right font-semibold tabular-nums ${
                      row.gap > 0 ? "text-rose-500" : "text-emerald-500"
                    }`}
                  >
                    {row.gap > 0 ? formatInt(row.gap) : "0"}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {row.hiresOpened > 0 ? (
                      <span>
                        {formatInt(row.hiresOpened)}
                        <span className="text-muted-foreground"> → {row.targetImpactLabel}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {row.hiresStarted > 0 ? (
                      formatInt(row.hiresStarted)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${risk.dot}`} />
                      <span className="text-muted-foreground">{risk.label}</span>
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 font-semibold ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}
