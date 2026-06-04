/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { useDimensionamento, DAYS, Day, NewAgentHire } from "@/context/DimensionamentoContext";
import { HeatmapEscala } from "@/components/HeatmapEscala";
import { EscalaTeamManager } from "@/components/EscalaTeamManager";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Users,
  Upload,
  Settings,
  Sparkles,
  TrendingUp,
  Sliders,
  RotateCcw,
  Plus,
  Trash,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel de Resumo - Dimensionamento Care" },
      {
        name: "description",
        content: "KPIs e gráficos de capacity, déficit e excedente por canal.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const {
    rowCalculations,
    totals,
    kpis,
    tmaFactors,
    simultaneousWC,
    simultaneousWA,
    scenarios,
    newHires,
    updateTimeBlockVolume,
    updateTmaFactor,
    updateSimultaneous,
    updateScenario,
    setNewHires,
    resetAll,
    importPowerBIData,
  } = useDimensionamento();

  // Active tab state
  const [activeTab, setActiveTab] = useState<
    "visao" | "heatmap" | "escala" | "forecast" | "import"
  >("visao");
  const [chartDay, setChartDay] = useState<Day>("Segunda");

  // Local state for Power BI file uploading
  const [wcCsvText, setWcCsvText] = useState("");
  const [waCsvText, setWaCsvText] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // New hire creator local state
  const [newHireName, setNewHireName] = useState("");
  const [newHireStart, setNewHireStart] = useState("09:00");
  const [newHireEnd, setNewHireEnd] = useState("18:00");
  const [newHireDays, setNewHireDays] = useState<Day[]>([
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
  ]);

  // Channel calculations wrapper for dashboard charts
  const webchatData = useMemo(() => {
    let volume = 0;
    let capacity = 0;
    let deficit = 0;
    let surplus = 0;

    const byDay = DAYS.map((d, idx) => {
      let dVol = 0;
      let dCap = 0;
      rowCalculations.forEach((r) => {
        dVol += (r as any).volume[idx] ?? 0;
        dCap += (r as any).capacityR[idx] ?? 0;
      });
      volume += dVol;
      capacity += dCap;
      const dDef = Math.max(0, dVol - dCap);
      const dSur = Math.max(0, dCap - dVol);
      deficit += dDef;
      surplus += dSur;
      return { day: d, volume: dVol, capacity: dCap, deficit: dDef, surplus: dSur };
    });

    return { volume, capacity, deficit, surplus, byDay };
  }, [rowCalculations]);

  const whatsappData = useMemo(() => {
    let volume = 0;
    let capacity = 0;
    let deficit = 0;
    let surplus = 0;

    const byDay = DAYS.map((d, idx) => {
      let dVol = 0;
      let dCap = 0;
      rowCalculations.forEach((r) => {
        dVol += (r as any).waVolume[idx] ?? 0;
        dCap += (r as any).waCapacityR[idx] ?? 0;
      });
      volume += dVol;
      capacity += dCap;
      const dDef = Math.max(0, dVol - dCap);
      const dSur = Math.max(0, dCap - dVol);
      deficit += dDef;
      surplus += dSur;
      return { day: d, volume: dVol, capacity: dCap, deficit: dDef, surplus: dSur };
    });

    return { volume, capacity, deficit, surplus, byDay };
  }, [rowCalculations]);

  // Aggregate hourly data for charts
  const hourlyChartData = useMemo(() => {
    const list: Record<
      string,
      { hour: string; Webchat: number; WhatsApp: number; Capacity: number }
    > = {};

    rowCalculations.forEach((r) => {
      const hour = r.time.slice(0, 2) + ":00";
      if (!list[hour]) {
        list[hour] = { hour, Webchat: 0, WhatsApp: 0, Capacity: 0 };
      }
      DAYS.forEach((_, idx) => {
        list[hour].Webchat += (r as any).volume[idx] ?? 0;
        list[hour].WhatsApp += (r as any).waVolume[idx] ?? 0;
        list[hour].Capacity += (r as any).waCapacityR[idx] ?? 0;
      });
    });

    return Object.values(list).sort((a, b) => a.hour.localeCompare(b.hour));
  }, [rowCalculations]);

  const channelCompareData = [
    {
      name: "Webchat",
      Volume: Number(webchatData.volume.toFixed(0)),
      Capacity: Number(webchatData.capacity.toFixed(0)),
      Déficit: Math.ceil(webchatData.deficit),
      Excedente: Number(webchatData.surplus.toFixed(0)),
    },
    {
      name: "WhatsApp",
      Volume: Number(whatsappData.volume.toFixed(0)),
      Capacity: Number(whatsappData.capacity.toFixed(0)),
      Déficit: Math.ceil(kpis.totalDeficit10),
      Excedente: Number(whatsappData.surplus.toFixed(0)),
    },
    {
      name: "Prova Real",
      Volume: Number(whatsappData.volume.toFixed(0)),
      Capacity: Number(totals.Segunda.prCapacity + totals.Terça.prCapacity) * 3, // mock proportional scaling
      Déficit: Math.ceil(kpis.provaRealDeficit10),
      Excedente: Number(kpis.excedenteTotal.toFixed(0)),
    },
  ];

  const dayMixData = DAYS.map((d, idx) => ({
    day: d.slice(0, 3),
    Volume: Number(whatsappData.byDay[idx].volume.toFixed(1)),
    Capacity: Number(whatsappData.byDay[idx].capacity.toFixed(0)),
    Déficit: Math.ceil(whatsappData.byDay[idx].deficit),
    Excedente: Number(webchatData.byDay[idx].surplus.toFixed(0)),
  }));

  const comparisonChartData = useMemo(() => {
    const dIdx = DAYS.indexOf(chartDay);
    return rowCalculations
      .filter((r) => r.time === "00:00" || (r.time >= "07:00" && r.time <= "23:50"))
      .map((r) => ({
        time: r.time,
        waResultado: Number((((r as any).waResultado?.[dIdx] ?? 0) / simultaneousWA).toFixed(4)),
        prResultado: Number((((r as any).prResultado?.[dIdx] ?? 0) / simultaneousWA).toFixed(4)),
      }));
  }, [rowCalculations, chartDay, simultaneousWA]);

  const comparisonYDomain = useMemo(() => {
    let minVal = 0;
    let maxVal = 0;
    comparisonChartData.forEach((d) => {
      minVal = Math.min(minVal, d.waResultado, d.prResultado);
      maxVal = Math.max(maxVal, d.waResultado, d.prResultado);
    });
    // Add margin for nice spacing
    const padding = Math.max(0.5, (maxVal - minVal) * 0.1);
    return [Number((minVal - padding).toFixed(2)), Number((maxVal + padding).toFixed(2))];
  }, [comparisonChartData]);

  // Passo 2: Month-over-Month simulation from Jan/26 to Dec/26 (up to 9,500 clients)
  const forecastData = useMemo(() => {
    const list = [];
    const months = [
      "Jan/26",
      "Fev/26",
      "Mar/26",
      "Abr/26",
      "Mai/26",
      "Jun/26",
      "Jul/26",
      "Ago/26",
      "Set/26",
      "Out/26",
      "Nov/26",
      "Dez/26",
    ];

    // Current metrics
    const currentBase = 3580;
    const currentHeadcount = 12; // active agents

    // Linear monthly growth target to reach the user target client base
    const baseTarget = scenarios.clientBase;
    const baseIncrement = (baseTarget - currentBase) / 11; // 11 months step

    for (let m = 0; m < 12; m++) {
      const estBase = currentBase + baseIncrement * m;

      // Calculate estimated tickets based on client base size and contact rate
      // 1 client generates contactRate tickets per month on average
      const estMonthlyVolume = estBase * (scenarios.contactRate / 100);

      // Target agent capacity (each agent handles ~1000 tickets per month under SLA targets)
      const agentMonthlyCapacity = 1000 * (1 - (100 - scenarios.slaTarget) / 300);

      const headcountRequired = Math.ceil(estMonthlyVolume / agentMonthlyCapacity);

      // Account for cumulative team turnover
      const headcountAvailable = Math.max(
        4,
        Number((currentHeadcount * Math.pow(1 - scenarios.turnoverRate / 100, m)).toFixed(1)),
      );

      list.push({
        month: months[m],
        "Clientes Ativos": Math.round(estBase),
        "Vol. Chamados (x10)": Math.round(estMonthlyVolume / 10),
        "Agentes Disponíveis": headcountAvailable,
        "Agentes Necessários": headcountRequired,
      });
    }

    return list;
  }, [scenarios]);

  // Find the exact month the team runs out of capacity
  const crossMonth = useMemo(() => {
    const match = forecastData.find((f) => f["Agentes Necessários"] > f["Agentes Disponíveis"]);
    return match ? match.month : "Estável em 2026";
  }, [forecastData]);

  // Handle mock file uploads
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wcCsvText && !waCsvText) return;
    const success = importPowerBIData(wcCsvText, waCsvText);
    if (success) {
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  // Add new hired agent to schedule
  const handleAddHire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHireName) return;
    const newAgent: NewAgentHire = {
      id: "h_" + Date.now(),
      name: newHireName,
      start_time: newHireStart,
      end_time: newHireEnd,
      days: newHireDays,
      active: true,
    };
    setNewHires((prev) => [...prev, newAgent]);
    setNewHireName("");
  };

  // Remove hired agent
  const handleRemoveHire = (id: string) => {
    setNewHires((prev) => prev.filter((h) => h.id !== id));
  };

  // Toggle active state of hired agent
  const toggleHire = (id: string) => {
    setNewHires((prev) => prev.map((h) => (h.id === id ? { ...h, active: !h.active } : h)));
  };

  const handleToggleDaySelection = (day: Day) => {
    setNewHireDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex rounded-full border bg-background/60 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Mapeador de Workforce
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Painel de Dimensionamento Dinâmico
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              "Mate" as planilhas manuais. Calcule volumes, deficit e escalas em tempo real.
            </p>
          </div>
          <button
            onClick={resetAll}
            className="self-start inline-flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            title="Restaurar dados originais de Fev/26"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
          </button>
        </div>

        {/* Global KPIs */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Capacidade Total (Weekly)"
            value={kpis.webchatCapacity.toLocaleString("pt-BR")}
            hint="Soma das escalas arredondadas"
            color="text-primary bg-primary/10"
          />
          <KpiCard
            icon={Gauge}
            label="Volume Geral Semanal"
            value={(kpis.webchatVolume + kpis.whatsappVolume).toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
            hint="Volume integrado Fev/26"
            color="text-success bg-success/10"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Déficit de Agentes (WhatsApp)"
            value={kpis.totalDeficit10.toString()}
            hint="Turnos em lacunas na semana"
            color="text-destructive bg-destructive/10"
            tone="bad"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Déficit Simulado (Prova Real)"
            value={kpis.provaRealDeficit10.toString()}
            hint="Gargalo restante pós-contratações"
            color="text-warning bg-warning/10"
            tone={kpis.provaRealDeficit10 > 0 ? "warn" : "good"}
          />
        </div>
      </section>

      {/* Tabs Switcher */}
      <div className="flex border-b gap-1 bg-muted/30 p-1 rounded-lg">
        {[
          { id: "visao", label: "Visão Geral & Gráficos", icon: Gauge },
          { id: "heatmap", label: "Mapa de Calor & IA Analyst", icon: Sparkles },
          { id: "escala", label: "Gestão de Escalas (CLT)", icon: Users },
          { id: "forecast", label: "Forecast de Crescimento (Passo 2)", icon: TrendingUp },
          { id: "import", label: "Ingestão de Dados (Passo 1)", icon: Upload },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === t.id
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content A: Visão Geral */}
      {activeTab === "visao" && (
        <div className="space-y-6">
          {/* Sincronizados lado a lado */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico do WhatsApp Original */}
            <div className="rounded-xl border bg-card p-5 shadow-sm border-border">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                    WhatsApp Original - {chartDay}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5"></p>
                </div>

                {/* Day selector on WhatsApp Card */}
                <div className="flex flex-wrap gap-1 select-none">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setChartDay(day)}
                      className={`px-2 py-0.5 text-[10px] font-semibold border rounded transition-all ${
                        chartDay === day
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonChartData}
                    syncId="whatsAppComparison"
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    barCategoryGap={1}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.08)"
                    />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      interval={7}
                      tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      domain={comparisonYDomain}
                      tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.04)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const val = payload[0].value as number;
                          const isPositive = val >= 0;
                          const colorClass = isPositive
                            ? "text-emerald-500 font-bold"
                            : "text-rose-500 font-bold";
                          return (
                            <div className="rounded-lg border bg-popover p-2.5 shadow-md border-border text-xs">
                              <p className="font-semibold text-foreground border-b border-border/40 pb-1 mb-1">
                                Horário: {payload[0].payload.time}
                              </p>
                              <div className="flex justify-between gap-4 py-0.5">
                                <span className="text-muted-foreground">WhatsApp Original:</span>
                                <span className={colorClass}>
                                  {isPositive ? `+${val.toFixed(3)}` : val.toFixed(3)} Ag.
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.3)" strokeWidth={1} />
                    <Bar
                      dataKey="waResultado"
                      name="WhatsApp Original"
                      fill="#3b82f6"
                      barSize={3.5}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico da Prova Real */}
            <div className="rounded-xl border bg-card p-5 shadow-sm border-border">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                    Prova Real (Simulado) - {chartDay}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5"></p>
                </div>

                {/* Day selector on Prova Real Card */}
                <div className="flex flex-wrap gap-1 select-none">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setChartDay(day)}
                      className={`px-2 py-0.5 text-[10px] font-semibold border rounded transition-all ${
                        chartDay === day
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonChartData}
                    syncId="whatsAppComparison"
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    barCategoryGap={1}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.08)"
                    />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      interval={7}
                      tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      domain={comparisonYDomain}
                      tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.04)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const val = payload[0].value as number;
                          const isPositive = val >= 0;
                          const colorClass = isPositive
                            ? "text-emerald-500 font-bold"
                            : "text-rose-500 font-bold";
                          return (
                            <div className="rounded-lg border bg-popover p-2.5 shadow-md border-border text-xs">
                              <p className="font-semibold text-foreground border-b border-border/40 pb-1 mb-1">
                                Horário: {payload[0].payload.time}
                              </p>
                              <div className="flex justify-between gap-4 py-0.5">
                                <span className="text-muted-foreground">Prova Real:</span>
                                <span className={colorClass}>
                                  {isPositive ? `+${val.toFixed(3)}` : val.toFixed(3)} Ag.
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.3)" strokeWidth={1} />
                    <Bar
                      dataKey="prResultado"
                      name="Prova Real"
                      fill="#10b981"
                      barSize={3.5}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content B: Heatmap */}
      {activeTab === "heatmap" && <HeatmapEscala />}

      {/* Tab Content E: Gestão de Escala de Agentes */}
      {activeTab === "escala" && <EscalaTeamManager />}

      {/* Tab Content C: Forecast Preditivo */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Forecast parameters panel */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Sliders className="h-4 w-4 text-primary" /> Premissas de Projeção MoM
              </div>
              <p className="text-xs text-muted-foreground">
                Calibre o simulador de crescimento para antecipar em qual mês o headcount será
                insuficiente.
              </p>

              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Base de Clientes (Alvo Dez/26)</span>
                    <span className="text-primary tabular-nums font-semibold">
                      {scenarios.clientBase.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3500"
                    max="12000"
                    step="100"
                    value={scenarios.clientBase}
                    onChange={(e) => updateScenario("clientBase", Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Contact Rate Mensal (Média %)</span>
                    <span className="text-primary tabular-nums font-semibold">
                      {scenarios.contactRate}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.1"
                    value={scenarios.contactRate}
                    onChange={(e) => updateScenario("contactRate", Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Taxa de Turnover / Mês</span>
                    <span className="text-primary tabular-nums font-semibold">
                      {scenarios.turnoverRate}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={scenarios.turnoverRate}
                    onChange={(e) => updateScenario("turnoverRate", Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Meta de SLA Target</span>
                    <span className="text-primary tabular-nums font-semibold">
                      {scenarios.slaTarget}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="75"
                    max="99"
                    step="1"
                    value={scenarios.slaTarget}
                    onChange={(e) => updateScenario("slaTarget", Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex gap-2 text-xs">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <strong className="text-destructive-foreground font-semibold">
                    Alerta de Capacidade Esgotada
                  </strong>
                  <p className="mt-0.5 text-muted-foreground">
                    Com base no crescimento e no turnover, o time atual ficará saturado no mês de:{" "}
                    <strong className="text-foreground font-bold">{crossMonth}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Forecast Line Chart */}
            <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold">
                  Projeção Headcount Necessário (Jan/26 - Dez/26)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Simulação do cruzamento de headcount disponível (curva de turnover) vs necessários
                  para sustentar a base.
                </p>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="Agentes Disponíveis"
                    stroke="var(--destructive)"
                    strokeWidth={2.5}
                    dot={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="Agentes Necessários"
                    stroke="var(--success)"
                    strokeWidth={2.5}
                    dot={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content D: Ingestão de Dados (CSV Power BI) */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Upload form container */}
            <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-semibold">Upload de Relatórios do Power BI</h2>
                <p className="text-xs text-muted-foreground">
                  Insira os dados brutos de volume (CSV) obtidos diretamente do Power BI para
                  recalcular a base de 90 dias.
                </p>
              </div>

              {uploadSuccess && (
                <div className="rounded-lg bg-success/15 border border-success/30 p-3 text-xs text-success flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" /> Ingestão concluída com sucesso! Os volumes
                  de 10 min foram recalculados e distribuídos por 13 semanas.
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Relatório Webchat (CSV)
                    </label>
                    <textarea
                      value={wcCsvText}
                      onChange={(e) => setWcCsvText(e.target.value)}
                      placeholder="Volume;Segunda;Terça;Quarta...&#10;07:00:00;1;2;0;1..."
                      className="w-full h-48 bg-background border rounded-xl p-3 font-mono text-[10px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Relatório WhatsApp (CSV)
                    </label>
                    <textarea
                      value={waCsvText}
                      onChange={(e) => setWaCsvText(e.target.value)}
                      placeholder="Volume;Segunda;Terça;Quarta...&#10;07:00:00;2;1;3;0..."
                      className="w-full h-48 bg-background border rounded-xl p-3 font-mono text-[10px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 text-xs font-semibold hover:bg-primary/95 transition-all shadow-md"
                >
                  <Upload className="h-4 w-4" /> Processar e Limpar Relatórios (Ingestão
                  Client-Side)
                </button>
              </form>
            </div>

            {/* Prova Real contratações configuration */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold">Simular Escala - Prova Real</h3>
                <p className="text-xs text-muted-foreground">
                  Configure os horários trabalhistas 5x2 dos novos contratados para simular a
                  atenuação de gargalos no mapa de calor.
                </p>
              </div>

              {/* Active hires list */}
              <div className="space-y-2 max-h-[14rem] overflow-y-auto pr-1">
                {newHires.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2 border rounded-xl bg-muted/30 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">{h.name}</span>
                      <div className="text-[10px] text-muted-foreground">
                        {h.start_time} - {h.end_time} · {h.days.length} dias
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={h.active}
                        onChange={() => toggleHire(h.id)}
                        className="rounded border bg-background accent-primary h-4 w-4 cursor-pointer"
                        title="Ativar/Desativar na simulação"
                      />
                      <button
                        onClick={() => handleRemoveHire(h.id)}
                        className="p-1 rounded text-destructive hover:bg-destructive/15 transition-all"
                        title="Remover"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Hire form */}
              <form onSubmit={handleAddHire} className="space-y-3 pt-2 border-t text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                    Nome do Agente
                  </label>
                  <input
                    type="text"
                    required
                    value={newHireName}
                    onChange={(e) => setNewHireName(e.target.value)}
                    placeholder="Ex: Agente Contratado 5"
                    className="w-full bg-background border rounded px-2.5 py-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                      Entrada
                    </label>
                    <input
                      type="text"
                      required
                      value={newHireStart}
                      onChange={(e) => setNewHireStart(e.target.value)}
                      placeholder="09:00"
                      className="w-full bg-background border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                      Saída (CLT)
                    </label>
                    <input
                      type="text"
                      required
                      value={newHireEnd}
                      onChange={(e) => setNewHireEnd(e.target.value)}
                      placeholder="18:00"
                      className="w-full bg-background border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                    Dias de Trabalho
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map((day) => {
                      const selected = newHireDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDaySelection(day)}
                          className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                            selected
                              ? "bg-primary border-primary text-primary-foreground font-semibold"
                              : "text-muted-foreground hover:bg-muted"
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
                  className="w-full inline-flex items-center justify-center gap-1 rounded-lg border bg-background py-1.5 font-medium hover:bg-accent transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar na Simulação
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
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
  icon: any;
  label: string;
  value: string;
  hint?: string;
  color?: string;
  tone?: "good" | "bad" | "warn";
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
    <div className="rounded-xl border bg-card p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">{label}</div>
      <div className="mt-1 space-y-0.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.dataKey}:</span>
            <span className="font-medium tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
