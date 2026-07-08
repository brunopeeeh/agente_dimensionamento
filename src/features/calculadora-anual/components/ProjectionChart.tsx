import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInt } from "../engine";
import type { ProjectionResult } from "../engine";

type Props = {
  projection: ProjectionResult;
};

export function ProjectionChart({ projection }: Props) {
  const data = projection.rows.map((r) => ({
    label: r.month.label,
    volumeHuman: Math.round(r.volumeHuman),
    capacity: Math.round(r.capacityAvailableTotal),
    hires: r.hiresStarted,
  }));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm border-border">
      <div className="mb-5 border-b border-border/40 pb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
          Demanda humana × Capacidade
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Volume após deflexão de IA versus capacidade efetiva da equipe, com as admissões
          projetadas por mês.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(148, 163, 184, 0.08)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
            />
            <YAxis
              yAxisId="volume"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
            />
            <YAxis
              yAxisId="hires"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md border-border">
                    <p className="mb-1 border-b border-border/40 pb-1 font-semibold text-foreground">
                      {row.label}
                    </p>
                    <div className="flex justify-between gap-4 py-0.5">
                      <span className="text-muted-foreground">Volume humano:</span>
                      <span className="font-bold text-[#3b82f6]">{formatInt(row.volumeHuman)}</span>
                    </div>
                    <div className="flex justify-between gap-4 py-0.5">
                      <span className="text-muted-foreground">Capacidade:</span>
                      <span className="font-bold text-[#10b981]">{formatInt(row.capacity)}</span>
                    </div>
                    <div className="flex justify-between gap-4 py-0.5">
                      <span className="text-muted-foreground">Admissões:</span>
                      <span className="font-bold text-foreground">{row.hires}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              yAxisId="hires"
              dataKey="hires"
              name="Admissões"
              fill="rgba(148, 163, 184, 0.35)"
              barSize={14}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="volume"
              type="monotone"
              dataKey="volumeHuman"
              name="Volume humano"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="volume"
              type="monotone"
              dataKey="capacity"
              name="Capacidade"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
