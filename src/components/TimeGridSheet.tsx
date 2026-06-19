/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect, lazy, Suspense } from "react";
import { useDimensionamento, DAYS, Day } from "@/context/DimensionamentoContext";
import { RotateCcw, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const TimeGridChart = lazy(() =>
  import("./TimeGridChart").then((module) => ({ default: module.TimeGridChart })),
);

export type GridMode = "webchat" | "whatsapp" | "provaReal";

type Props = { mode: GridMode; title: string; subtitle?: string };

type View = "volume" | "capacity" | "capacityR" | "resultado" | "faltam10" | "faltam20";

const MODE_LABELS: Record<GridMode, string> = {
  webchat: "Webchat",
  whatsapp: "WhatsApp",
  provaReal: "Prova Real",
};

export function TimeGridSheet({ mode, title, subtitle }: Props) {
  const rowCalculations = useDimensionamento((s) => s.rowCalculations);
  const updateTimeBlockVolume = useDimensionamento((s) => s.updateTimeBlockVolume);
  const updateTimeBlockAgents = useDimensionamento((s) => s.updateTimeBlockAgents);
  const resetAll = useDimensionamento((s) => s.resetAll);
  const updateChannelVolumes = useDimensionamento((s) => s.updateChannelVolumes);

  const [view, setView] = useState<View>("capacity");
  const [chartDay, setChartDay] = useState<Day>("Segunda");
  const [isUploading, setIsUploading] = useState(false);

  const channel: "webchat" | "whatsapp" = mode === "webchat" ? "webchat" : "whatsapp";
  const isWebchat = mode === "webchat";
  const isProvaReal = mode === "provaReal";
  const channelLabel = MODE_LABELS[mode];

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        if (workbook.SheetNames.length === 0) {
          throw new Error("O arquivo Excel está vazio ou não possui abas válidas.");
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert worksheet to JSON rows (array of arrays)
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length < 2) {
          throw new Error("O arquivo Excel não contém linhas de dados suficientes.");
        }

        // Row 0 has headers
        const headers = rows[0].map((h) =>
          String(h || "")
            .trim()
            .toLowerCase(),
        );

        // Find day columns index dynamically
        const dayCols: { day: Day; index: number }[] = [];
        const dayMap: Record<string, Day> = {
          seg: "Segunda",
          ter: "Terça",
          qua: "Quarta",
          qui: "Quinta",
          sex: "Sexta",
          sab: "Sábado",
          sáb: "Sábado",
          dom: "Domingo",
        };

        headers.forEach((h, idx) => {
          Object.keys(dayMap).forEach((short) => {
            if (h === short || h.startsWith(short)) {
              if (!dayCols.some((dc) => dc.day === dayMap[short])) {
                dayCols.push({ day: dayMap[short], index: idx });
              }
            }
          });
        });

        if (dayCols.length === 0) {
          throw new Error(
            "Não foram encontradas as colunas de dias da semana (seg, ter, qua...). Verifique o cabeçalho do arquivo.",
          );
        }

        const newVolumes: Record<string, Record<Day, number>> = {};
        let parsedRowsCount = 0;

        // Process each row (skip row 0 headers, and optionally skip row 1 if it is a subheader)
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i];
          if (!cells || cells.length === 0) continue;

          const rawTime = cells[0];
          if (rawTime === null || rawTime === undefined || String(rawTime).trim() === "") continue;

          let timeStr = "";

          // Handle serial time number from Excel (e.g. 0.291666 represents 07:00)
          if (typeof rawTime === "number") {
            const totalMinutes = Math.round(rawTime * 24 * 60);
            const hh = Math.floor(totalMinutes / 60) % 24;
            const mm = totalMinutes % 60;
            timeStr = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
          } else {
            // Robust String matching for 12h and 24h formats
            const clean = String(rawTime).trim().toLowerCase();

            // Try standard 24h format (HH:MM:SS or HH:MM)
            const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
            if (match24) {
              const hh = match24[1].padStart(2, "0");
              const mm = match24[2].padStart(2, "0");
              timeStr = `${hh}:${mm}`;
            } else {
              // Try standard 12h format (HH:MM am/pm or HH:MM:SS am/pm)
              const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/);
              if (match12) {
                let hh = parseInt(match12[1], 10);
                const mm = match12[2].padStart(2, "0");
                const isPm = match12[3] === "pm";
                if (hh >= 1 && hh <= 12) {
                  if (isPm && hh < 12) hh += 12;
                  if (!isPm && hh === 12) hh = 0;
                  timeStr = `${String(hh).padStart(2, "0")}:${mm}`;
                }
              }
            }

            if (!timeStr) {
              // Not a valid time slot string, probably a subheader label row (e.g. "created") or text, skip
              continue;
            }
          }

          newVolumes[timeStr] = {} as Record<Day, number>;

          dayCols.forEach(({ day, index }) => {
            let val = 0;
            const cellVal = cells[index];
            if (cellVal !== null && cellVal !== undefined) {
              if (typeof cellVal === "number") {
                val = cellVal;
              } else {
                val = Number(String(cellVal).replace(",", ".")) || 0;
              }
            }
            // Ingestion Rule: Divide by 13 weeks to get weekly average volume from 3 months total data
            newVolumes[timeStr][day] = Math.max(0, val / 13);
          });

          parsedRowsCount++;
        }

        if (parsedRowsCount === 0) {
          throw new Error(
            "Não foram encontrados dados de volume de chamados válidos com horários reconhecidos.",
          );
        }

        updateChannelVolumes(channel, newVolumes);
        toast.success(
          `Planilha processada! ${parsedRowsCount} faixas de horários importadas e divididas por 13.`,
        );
      } catch (err: any) {
        console.error("Error reading excel file:", err);
        toast.error(`Erro ao processar planilha: ${err?.message || "Layout incompatível"}`);
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      toast.error("Não foi possível ler o arquivo selecionado.");
      setIsUploading(false);
      e.target.value = "";
    };

    reader.readAsArrayBuffer(file);
  };

  // Reset to capacity if faltam20 is active — it's removed from all channels now
  useEffect(() => {
    if (view === "faltam20") {
      setView("capacity");
    }
  }, [view]);

  // Dynamically define views available for this tab
  const currentViews = useMemo(() => {
    if (isWebchat) {
      return [
        { id: "volume" as View, label: "Volume" },
        { id: "capacity" as View, label: "Capacity" },
        { id: "capacityR" as View, label: "Capacity Arredondado" },
        { id: "resultado" as View, label: "Resultado" },
        { id: "faltam10" as View, label: "Agentes para o Whatsapp" },
      ];
    }
    return [
      { id: "volume" as View, label: "Volume" },
      { id: "capacity" as View, label: "Capacity" },
      { id: "capacityR" as View, label: "Capacity Arredondado" },
      { id: "resultado" as View, label: "Resultado" },
      { id: "faltam10" as View, label: "Quantidade de Agentes que Faltam", tone: "warn" as const },
    ];
  }, [isWebchat]);

  // Determine arrays for each day for the selected mode
  const gridRows = useMemo(() => {
    return rowCalculations.map((r) => {
      const time = r.time;
      let volume: number[];
      let capacity: number[];
      let capacityR: number[];
      let resultado: number[];
      let faltam10: number[];
      let faltam20: number[];

      if (isWebchat) {
        volume = (r as any).volume;
        capacity = (r as any).capacity;
        capacityR = (r as any).capacityR;
        resultado = (r as any).resultado;
        // In Webchat, faltam10 represents "Agentes para o Whatsapp" (wcAgentsForWhats calculated as floor of surplus/3)
        faltam10 = (r as any).agentsWhats || Array(7).fill(0);
        faltam20 = Array(7).fill(0);
      } else if (isProvaReal) {
        volume = (r as any).waVolume;
        capacity = (r as any).prCapacity;
        capacityR = (r as any).prCapacityR;
        resultado = (r as any).prResultado;
        faltam10 = (r as any).prFaltam10;
        faltam20 = (r as any).prFaltam20;
      } else {
        // WhatsApp sheet
        volume = (r as any).waVolume;
        capacity = (r as any).waCapacity;
        capacityR = (r as any).waCapacityR;
        resultado = (r as any).waResultado;
        faltam10 = (r as any).waFaltam10;
        faltam20 = (r as any).waFaltam20;
      }

      return {
        time,
        volume,
        capacity,
        capacityR,
        resultado,
        faltam10,
        faltam20,
        waResultado: (r as any).waResultado || Array(7).fill(0),
        prResultado: (r as any).prResultado || Array(7).fill(0),
      };
    });
  }, [rowCalculations, isWebchat, isProvaReal]);

  const totals = useMemo(() => {
    return DAYS.map((_, d) => ({
      volume: gridRows.reduce((s, r) => s + r.volume[d], 0),
      capacity: gridRows.reduce((s, r) => s + r.capacity[d], 0),
      capacityR: gridRows.reduce((s, r) => s + r.capacityR[d], 0),
      resultado: gridRows.reduce((s, r) => s + r.resultado[d], 0),
      faltam10: gridRows.reduce((s, r) => s + r.faltam10[d], 0),
      faltam20: gridRows.reduce((s, r) => s + r.faltam20[d], 0),
    }));
  }, [gridRows]);

  const chartData = useMemo(() => {
    const dIdx = DAYS.indexOf(chartDay);
    return gridRows.map((r) => ({
      time: r.time,
      waResultado: Number(r.waResultado[dIdx].toFixed(2)),
      prResultado: Number(r.prResultado[dIdx].toFixed(2)),
    }));
  }, [gridRows, chartDay]);

  const handleVolChange = (time: string, dayIdx: number, val: number) => {
    const day = DAYS[dayIdx];
    updateTimeBlockVolume(time, day, channel, val);
  };

  const handleCapRChange = (time: string, dayIdx: number, val: number) => {
    const day = DAYS[dayIdx];
    // If it's Webchat, modifying capacityR edits the underlying active agents scale!
    if (isWebchat) {
      updateTimeBlockAgents(time, day, val);
    }
  };

  return (
    <div className="space-y-5">
      {/* Excel Upload Area */}
      {!isProvaReal && (
        <div className="rounded-2xl border border-dashed bg-card/60 backdrop-blur p-6 transition-all hover:bg-accent/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Importar Relatório de Volume (Excel .xlsx)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Selecione a planilha de volumes de 3 meses. O sistema identificará as colunas de
                dias da semana e aplicará o cálculo de divisão por 13 automaticamente para preencher
                o volume médio semanal do {channelLabel}.
              </p>
            </div>
          </div>

          <div className="relative shrink-0 w-full sm:w-auto">
            <label
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold hover:bg-primary/95 transition-all shadow-md cursor-pointer ${isUploading ? "opacity-70 pointer-events-none" : ""}`}
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Carregar Planilha (.xlsx)
                </>
              )}
              <input
                type="file"
                accept=".xlsx, .xls"
                disabled={isUploading}
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {currentViews.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
            <button
              onClick={resetAll}
              className="ml-2 inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              title="Restaurar originais"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="bg-card px-3 py-2 text-left font-medium">Horário</th>
                {DAYS.map((d) => (
                  <th key={d} className="px-3 py-2 text-right font-medium">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridRows.map((r) => (
                <tr key={r.time} className="border-b last:border-0 hover:bg-accent/20">
                  <td className="bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground">
                    {r.time}
                  </td>
                  {DAYS.map((_, d) => (
                    <ValueCell
                      key={d}
                      view={view}
                      vol={r.volume[d]}
                      cap={r.capacity[d]}
                      capR={r.capacityR[d]}
                      res={r.resultado[d]}
                      f10={r.faltam10[d]}
                      f20={r.faltam20[d]}
                      isEditableCapR={false} // Capacity is derived dynamically from the active agents' schedules
                      isWebchat={isWebchat}
                      onVol={(v) => handleVolChange(r.time, d, v)}
                      onCapR={(v) => handleCapRChange(r.time, d, v)}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur">
              <tr className="border-t font-semibold">
                <td className="px-3 py-2">Total</td>
                {DAYS.map((_, d) => {
                  const t = totals[d];
                  const label =
                    view === "volume"
                      ? t.volume.toFixed(1)
                      : view === "capacity"
                        ? t.capacity.toFixed(1)
                        : view === "capacityR"
                          ? t.capacityR.toFixed(0)
                          : view === "resultado"
                            ? t.resultado.toFixed(1)
                            : view === "faltam10"
                              ? t.faltam10.toFixed(0)
                              : t.faltam20.toFixed(0);
                  return (
                    <td key={d} className="px-3 py-2 text-right tabular-nums">
                      {label}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Dynamic Results Chart Section for WhatsApp and Prova Real */}
      {!isWebchat && (
        <Suspense
          fallback={
            <div
              className="mt-6 h-[420px] animate-pulse rounded-xl border bg-muted/40"
              aria-hidden="true"
            />
          }
        >
          <TimeGridChart
            chartData={chartData}
            chartDay={chartDay}
            isProvaReal={isProvaReal}
            onChartDayChange={setChartDay}
          />
        </Suspense>
      )}
    </div>
  );
}

import React from "react";

const ValueCell = React.memo(
  function ValueCell({
    view,
    vol,
    cap,
    capR,
    res,
    f10,
    f20,
    isEditableCapR,
    isWebchat,
    onVol,
    onCapR,
  }: {
    view: View;
    vol: number;
    cap: number;
    capR: number;
    res: number;
    f10: number;
    f20: number;
    isEditableCapR: boolean;
    isWebchat: boolean;
    onVol: (v: number) => void;
    onCapR: (v: number) => void;
  }) {
  if (view === "volume") {
    return (
      <td className="px-2 py-1 text-right">
        <input
          type="number"
          step="0.01"
          value={Number(vol.toFixed(3))}
          onChange={(e) => onVol(Number(e.target.value) || 0)}
          className="w-20 rounded-md border bg-background px-2 py-0.5 text-right text-xs tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/40"
        />
      </td>
    );
  }
  if (view === "capacityR") {
    return (
      <td className="px-2 py-1 text-right">
        {isEditableCapR ? (
          <input
            type="number"
            step="1"
            value={capR}
            onChange={(e) => onCapR(Number(e.target.value) || 0)}
            className="w-16 rounded-md border bg-background px-2 py-0.5 text-right text-xs tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/40"
          />
        ) : (
          <span className="text-xs tabular-nums font-semibold px-2">{capR}</span>
        )}
      </td>
    );
  }
  if (view === "capacity") {
    return (
      <td className="px-3 py-1.5 text-right text-xs tabular-nums text-muted-foreground">
        {cap.toFixed(2)}
      </td>
    );
  }
  if (view === "resultado") {
    const val = res;
    if (val > 0) {
      // Positive surplus -> dynamic green gradient background
      const intensity = Math.min(val / 10, 1.0);
      const alpha = 0.08 + intensity * 0.35; // ranges from 0.08 to 0.43 opacity
      return (
        <td
          style={{ backgroundColor: `rgba(16, 185, 129, ${alpha})` }}
          className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-300 transition-colors duration-150"
        >
          {val.toFixed(2)}
        </td>
      );
    }
    if (val < 0) {
      // Negative deficit -> dynamic red gradient background
      const intensity = Math.min(Math.abs(val) / 10, 1.0);
      const alpha = 0.08 + intensity * 0.35; // ranges from 0.08 to 0.43 opacity
      return (
        <td
          style={{ backgroundColor: `rgba(239, 68, 68, ${alpha})` }}
          className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums text-rose-800 dark:text-rose-300 transition-colors duration-150"
        >
          {val.toFixed(2)}
        </td>
      );
    }
    return (
      <td className="px-3 py-1.5 text-right text-xs tabular-nums text-muted-foreground/50">0.00</td>
    );
  }

  // Faltam or Agentes p/ Whats
  const f = view === "faltam20" ? f20 : f10;

  if (view === "faltam10" && isWebchat) {
    // "Agentes para o Whatsapp" - Positive release badge (light green)
    return (
      <td className="px-2 py-1 text-right">
        {f > 0 ? (
          <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {f}
          </span>
        ) : (
          <span className="inline-flex min-w-[2rem] justify-center rounded border border-zinc-300 dark:border-zinc-700 bg-muted/20 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
            0
          </span>
        )}
      </td>
    );
  }

  return (
    <td className="px-2 py-1 text-right">
      {f > 0 ? (
        <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive animate-pulse">
          {f}
        </span>
      ) : f < 0 ? (
        <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {f}
        </span>
      ) : (
        <span className="inline-flex min-w-[2rem] justify-center rounded border border-zinc-300 dark:border-zinc-700 bg-muted/20 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
          0
        </span>
      )}
    </td>
  );
},
(prev, next) => {
  return (
    prev.view === next.view &&
    prev.vol === next.vol &&
    prev.cap === next.cap &&
    prev.capR === next.capR &&
    prev.res === next.res &&
    prev.f10 === next.f10 &&
    prev.f20 === next.f20 &&
    prev.isEditableCapR === next.isEditableCapR &&
    prev.isWebchat === next.isWebchat
  );
});
