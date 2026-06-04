/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import rawData from "@/data/sheets.json";
import { INITIAL_TEAM_AGENTS } from "./initial_agents";
import { supabase } from "@/lib/supabaseClient";

// Type definitions
export type Day = "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado" | "Domingo";
export const DAYS: Day[] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export type IntervalStatus = "trabalhando" | "pausa" | "folga" | "externo";

export type AgentSchedule = {
  intervals: Record<string, IntervalStatus>;
};

export type TeamAgent = {
  id: string;
  name: string;
  active: boolean;
  schedules: Partial<Record<Day, AgentSchedule>>;
};

export type NewAgentHire = {
  id: string;
  name: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  days: Day[];
  active: boolean;
};

export type CapacityAgent = {
  name: string;
  mediaTri: number;
};

export const normalizeName = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z]/g, ""); // keep only alphabet letters
};

export const matchAgentName = (capName: string, teamName: string) => {
  const capNorm = normalizeName(capName);
  const teamNorm = normalizeName(teamName);

  // Explicit manual mappings for discrepancies between trimester volume names & team schedules
  if (capNorm === "andreia" && teamNorm.includes("andrea")) return true;
  if (capNorm === "marlonsa" && teamNorm.includes("marlon")) return true;
  if (capNorm === "malu" && (teamNorm.includes("malu") || teamNorm.includes("marialuiza")))
    return true;
  if (capNorm === "romerio" && teamNorm.includes("romerio")) return true;
  if (capNorm === "brenda" && teamNorm.includes("brenda")) return true;
  if (capNorm === "rafael" && teamNorm.includes("rafael")) return true;
  if (capNorm === "bryan" && teamNorm.includes("bryan")) return true;
  if (capNorm === "julio" && teamNorm.includes("julio")) return true;

  return teamNorm.includes(capNorm) || capNorm.includes(teamNorm);
};

export type ScenarioParams = {
  clientBase: number;
  contactRate: number; // in %
  turnoverRate: number; // in %
  slaTarget: number; // in %
};

export type RowCalculation = {
  time: string;
  webchat: {
    volume: number;
    capacityRaw: number;
    capacityRounded: number;
    surplus: number;
    agentsForWhats: number;
  };
  whatsapp: {
    volume: number;
    capacityRaw: number;
    capacityRounded: number;
    surplus: number;
    agentsFaltantes10: number;
    agentsFaltantes20: number;
  };
  provaReal: {
    capacityRaw: number;
    capacityRounded: number;
    surplus: number;
    agentsFaltantes10: number;
    agentsFaltantes20: number;
  };
};

export type DimensionamentoState = {
  // Raw and computed grids
  rowCalculations: RowCalculation[];
  totals: Record<
    Day,
    {
      wcVolume: number;
      wcCapacity: number;
      waVolume: number;
      waCapacity: number;
      waDeficit10: number;
      prCapacity: number;
      prDeficit10: number;
    }
  >;
  kpis: {
    webchatVolume: number;
    webchatCapacity: number;
    whatsappVolume: number;
    whatsappCapacity: number;
    totalDeficit10: number;
    totalDeficit20: number;
    provaRealDeficit10: number;
    excedenteTotal: number;
  };
  // Parameters
  tmaFactors: Record<Day, number>;
  simultaneousWC: number;
  simultaneousWA: number;
  teamAgents: TeamAgent[];
  newHires: NewAgentHire[];
  scenarios: ScenarioParams;
  capacityAgents: CapacityAgent[];
  currentMonth: string;
  availableMonths: string[];
  isLoading: boolean;
  changeActiveMonth: (monthName: string) => Promise<void>;
  createNewMonth: (newMonthName: string) => Promise<void>;
  // Setters
  updateTimeBlockVolume: (
    time: string,
    day: Day,
    channel: "webchat" | "whatsapp",
    value: number,
  ) => void;
  updateTimeBlockAgents: (time: string, day: Day, value: number) => void;
  updateTmaFactor: (day: Day, value: number) => void;
  updateSimultaneous: (channel: "webchat" | "whatsapp", value: number) => void;
  setTeamAgents: React.Dispatch<React.SetStateAction<TeamAgent[]>>;
  toggleIntervalStatus: (agentId: string, day: Day, time20: string) => void;
  applyPresetShift: (
    agentId: string,
    day: Day,
    start: string,
    end: string,
    lunchStart: string,
    externalStart?: string,
    externalDurationMin?: number,
  ) => void;
  toggleAgentActive: (agentId: string) => void;
  addTeamAgent: (name: string) => void;
  removeTeamAgent: (agentId: string) => void;
  updateTeamAgentName: (agentId: string, name: string) => void;
  setNewHires: React.Dispatch<React.SetStateAction<NewAgentHire[]>>;
  updateScenario: (key: keyof ScenarioParams, value: number) => void;
  updateCapacityAgent: (name: string, value: number) => void;
  resetAll: () => void;
  importPowerBIData: (webchatCsv: string, whatsappCsv: string) => boolean;
  updateChannelVolumes: (
    channel: "webchat" | "whatsapp",
    newVolumes: Record<string, Record<Day, number>>,
  ) => void;
};

const DimensionamentoContext = createContext<DimensionamentoState | undefined>(undefined);

// Core constants mapped from the spreadsheet
const VOL_COLS = [1, 2, 3, 4, 5, 6, 7];
const CAP_COLS = [10, 11, 12, 13, 14, 15, 16];

// Day multiplier maps
const DEFAULT_TMA_FACTORS: Record<Day, number> = {
  Segunda: 1.63,
  Terça: 1.67,
  Quarta: 1.35,
  Quinta: 1.33,
  Sexta: 1.33,
  Sábado: 1.64,
  Domingo: 1.76,
};

export const DimensionamentoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load sheets from raw data
  const rawSheets = rawData as Record<string, (string | number | null)[][]>;
  const wcRaw = rawSheets["Fevereiro-26-Webchat"] || [];
  const waRaw = rawSheets["Fevereiro-26-Whatsapp"] || [];

  // Data rows mapping (starts from row index 1 to ignore headers)
  const timeBlocks = useMemo(() => {
    return wcRaw
      .slice(1)
      .filter((r) => r[0])
      .map((r) => String(r[0]));
  }, [wcRaw]);

  // Initial volume and agent grids
  const initialData = useMemo(() => {
    const webchatVolumes: Record<string, Record<Day, number>> = {};
    const whatsappVolumes: Record<string, Record<Day, number>> = {};
    const agentsScheduled: Record<string, Record<Day, number>> = {};

    timeBlocks.forEach((time, idx) => {
      webchatVolumes[time] = {} as Record<Day, number>;
      whatsappVolumes[time] = {} as Record<Day, number>;
      agentsScheduled[time] = {} as Record<Day, number>;

      const wcRow = wcRaw[idx + 1] || [];
      const waRow = waRaw[idx + 1] || [];

      DAYS.forEach((day, dIdx) => {
        const wcVol =
          typeof wcRow[VOL_COLS[dIdx]] === "number" ? (wcRow[VOL_COLS[dIdx]] as number) : 0;
        const waVol =
          typeof waRow[VOL_COLS[dIdx]] === "number" ? (waRow[VOL_COLS[dIdx]] as number) : 0;
        const wcCapRaw =
          typeof wcRow[CAP_COLS[dIdx]] === "number" ? (wcRow[CAP_COLS[dIdx]] as number) : 0;

        webchatVolumes[time][day] = wcVol;
        whatsappVolumes[time][day] = waVol;

        // Infer active agents from the raw capacity column using the day factor
        const factor = DEFAULT_TMA_FACTORS[day];
        agentsScheduled[time][day] = factor > 0 ? Math.round(wcCapRaw / factor) : 0;
      });
    });

    return { webchatVolumes, whatsappVolumes, agentsScheduled };
  }, [timeBlocks, wcRaw, waRaw]);

  // Initial capacity agents
  const initialCapacityAgents = useMemo(() => {
    const sheet = rawSheets["Capacity p dia - Fevereiro26"] || [];
    const human = sheet.slice(2, 14);
    const tail = sheet.slice(22, 24);
    return [...human, ...tail]
      .filter((r) => typeof r[0] === "string" && typeof r[1] === "number")
      .map((r) => ({ name: r[0] as string, mediaTri: r[1] as number }));
  }, [rawSheets]);

  const [currentMonth, setCurrentMonth] = useState<string>("Fevereiro 2026");
  const [availableMonths, setAvailableMonths] = useState<string[]>(["Fevereiro 2026"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State definitions
  const [webchatVolumes, setWebchatVolumes] = useState(initialData.webchatVolumes);
  const [whatsappVolumes, setWhatsappVolumes] = useState(initialData.whatsappVolumes);
  const [agentsScheduled, setAgentsScheduled] = useState(initialData.agentsScheduled);
  const [capacityAgents, setCapacityAgents] = useState<CapacityAgent[]>(() => {
    try {
      const saved = !supabase ? localStorage.getItem("yooga_capacity_agents") : null;
      return saved ? JSON.parse(saved) : initialCapacityAgents;
    } catch {
      return initialCapacityAgents;
    }
  });

  const [tmaFactors, setTmaFactors] = useState<Record<Day, number>>(DEFAULT_TMA_FACTORS);
  const [simultaneousWC, setSimultaneousWC] = useState(3);
  const [simultaneousWA, setSimultaneousWA] = useState(4);

  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>(() => {
    try {
      const saved = !supabase ? localStorage.getItem("yooga_team_agents") : null;
      return saved ? JSON.parse(saved) : INITIAL_TEAM_AGENTS;
    } catch {
      return INITIAL_TEAM_AGENTS;
    }
  });

  useEffect(() => {
    if (supabase) return;
    try {
      localStorage.setItem("yooga_team_agents", JSON.stringify(teamAgents));
    } catch (e) {
      console.error("Error saving team agents to localStorage:", e);
    }
  }, [teamAgents]);

  useEffect(() => {
    if (supabase) return;
    try {
      localStorage.setItem("yooga_capacity_agents", JSON.stringify(capacityAgents));
    } catch (e) {
      console.error("Error saving capacity agents to localStorage:", e);
    }
  }, [capacityAgents]);

  // Scenarios state
  const [scenarios, setScenarios] = useState<ScenarioParams>({
    clientBase: 3580, // current approximate base
    contactRate: 6.2, // 6.2% of support contact rate
    turnoverRate: 2.0, // 2% turnover monthly
    slaTarget: 95, // 95% SLA target
  });

  // Hired agents list for Prova Real (Step 1 analysis)
  // Presetting the 4 recommended agents from Seção 5 prompt example to make it visual!
  const [newHires, setNewHires] = useState<NewAgentHire[]>([
    {
      id: "h1",
      name: "Agente Contratado 1",
      start_time: "09:00",
      end_time: "18:00",
      days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
      active: true,
    },
    {
      id: "h2",
      name: "Agente Contratado 2",
      start_time: "10:00",
      end_time: "19:00",
      days: ["Segunda", "Terça", "Quinta", "Sexta", "Sábado"],
      active: true,
    },
    {
      id: "h3",
      name: "Agente Contratado 3",
      start_time: "11:00",
      end_time: "20:00",
      days: ["Segunda", "Quarta", "Quinta", "Sexta", "Domingo"],
      active: true,
    },
    {
      id: "h4",
      name: "Agente Contratado 4",
      start_time: "12:00",
      end_time: "21:00",
      days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
      active: true,
    },
  ]);

  const loadMonthDataFromSupabase = async (monthName: string) => {
    const client = supabase;
    if (!client) return;

    try {
      const { data: monthObj, error: monthError } = await client
        .from("meses")
        .select("id")
        .eq("nome", monthName)
        .single();

      if (monthError) throw monthError;
      const mesId = monthObj.id;

      const [escalaRes, volumesRes, paramsRes] = await Promise.all([
        client.from("escala_equipe").select("*").eq("mes_id", mesId).maybeSingle(),
        client.from("volumes_chamados").select("*").eq("mes_id", mesId).maybeSingle(),
        client.from("parametros_operacionais").select("*").eq("mes_id", mesId).maybeSingle(),
      ]);

      if (escalaRes.data) {
        setTeamAgents(escalaRes.data.team_agents);
        setCapacityAgents(escalaRes.data.capacity_agents);
      }
      if (volumesRes.data) {
        setWebchatVolumes(volumesRes.data.webchat_volumes);
        setWhatsappVolumes(volumesRes.data.whatsapp_volumes);
      }
      if (paramsRes.data) {
        setTmaFactors(paramsRes.data.tma_factors);
        setSimultaneousWC(paramsRes.data.simultaneous_wc);
        setSimultaneousWA(paramsRes.data.simultaneous_wa);
        setScenarios(paramsRes.data.scenarios);
        setNewHires(paramsRes.data.new_hires);
      }
    } catch (err) {
      console.error(`Failed to load data for month ${monthName}:`, err);
    }
  };

  // Load months and active month data from Supabase
  useEffect(() => {
    async function initSupabase() {
      const client = supabase;
      if (!client) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data: monthsData, error: monthsError } = await client
          .from("meses")
          .select("*")
          .order("created_at", { ascending: true });

        if (monthsError) throw monthsError;

        let activeMonthName = currentMonth;
        let monthsList = monthsData.map((m: any) => m.nome);

        if (monthsList.length === 0) {
          const { data: newMonth, error: insertError } = await client
            .from("meses")
            .insert([{ nome: "Fevereiro 2026" }])
            .select()
            .single();

          if (insertError) throw insertError;

          const mesId = newMonth.id;

          await Promise.all([
            client.from("escala_equipe").insert([
              {
                mes_id: mesId,
                team_agents: INITIAL_TEAM_AGENTS,
                capacity_agents: initialCapacityAgents,
              },
            ]),
            client.from("volumes_chamados").insert([
              {
                mes_id: mesId,
                webchat_volumes: initialData.webchatVolumes,
                whatsapp_volumes: initialData.whatsappVolumes,
              },
            ]),
            client.from("parametros_operacionais").insert([
              {
                mes_id: mesId,
                tma_factors: DEFAULT_TMA_FACTORS,
                simultaneous_wc: 3,
                simultaneous_wa: 4,
                scenarios: {
                  clientBase: 3580,
                  contactRate: 6.2,
                  turnoverRate: 2.0,
                  slaTarget: 95,
                },
                new_hires: [
                  {
                    id: "h1",
                    name: "Agente Contratado 1",
                    start_time: "09:00",
                    end_time: "18:00",
                    days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
                    active: true,
                  },
                  {
                    id: "h2",
                    name: "Agente Contratado 2",
                    start_time: "10:00",
                    end_time: "19:00",
                    days: ["Segunda", "Terça", "Quinta", "Sexta", "Sábado"],
                    active: true,
                  },
                  {
                    id: "h3",
                    name: "Agente Contratado 3",
                    start_time: "11:00",
                    end_time: "20:00",
                    days: ["Segunda", "Quarta", "Quinta", "Sexta", "Domingo"],
                    active: true,
                  },
                  {
                    id: "h4",
                    name: "Agente Contratado 4",
                    start_time: "12:00",
                    end_time: "21:00",
                    days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
                    active: true,
                  },
                ],
              },
            ]),
          ]);

          monthsList = ["Fevereiro 2026"];
          activeMonthName = "Fevereiro 2026";
        }

        setAvailableMonths(monthsList);
        const targetMonth = monthsList.includes(currentMonth) ? currentMonth : monthsList[0];
        setCurrentMonth(targetMonth);
        await loadMonthDataFromSupabase(targetMonth);
      } catch (err) {
        console.error("Failed to initialize Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initSupabase();
  }, []);

  // Debounced auto-save to Supabase
  useEffect(() => {
    const client = supabase;
    if (!client || isLoading) return;

    const delayDebounce = setTimeout(async () => {
      try {
        const { data: monthObj, error: monthError } = await client
          .from("meses")
          .select("id")
          .eq("nome", currentMonth)
          .single();

        if (monthError) throw monthError;
        const mesId = monthObj.id;

        await Promise.all([
          client.from("escala_equipe").upsert(
            {
              mes_id: mesId,
              team_agents: teamAgents,
              capacity_agents: capacityAgents,
            },
            { onConflict: "mes_id" },
          ),
          client.from("volumes_chamados").upsert(
            {
              mes_id: mesId,
              webchat_volumes: webchatVolumes,
              whatsapp_volumes: whatsappVolumes,
            },
            { onConflict: "mes_id" },
          ),
          client.from("parametros_operacionais").upsert(
            {
              mes_id: mesId,
              tma_factors: tmaFactors,
              simultaneous_wc: simultaneousWC,
              simultaneous_wa: simultaneousWA,
              scenarios: scenarios,
              new_hires: newHires,
            },
            { onConflict: "mes_id" },
          ),
        ]);
        console.log(`Auto-saved all data for month ${currentMonth} to Supabase successfully.`);
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [
    currentMonth,
    webchatVolumes,
    whatsappVolumes,
    teamAgents,
    capacityAgents,
    tmaFactors,
    simultaneousWC,
    simultaneousWA,
    scenarios,
    newHires,
    isLoading,
  ]);

  const saveMonthDataToSupabase = async (monthName: string) => {
    const client = supabase;
    if (!client) return;

    try {
      const { data: monthObj, error: monthError } = await client
        .from("meses")
        .select("id")
        .eq("nome", monthName)
        .single();

      if (monthError) throw monthError;
      const mesId = monthObj.id;

      await Promise.all([
        client.from("escala_equipe").upsert(
          {
            mes_id: mesId,
            team_agents: teamAgents,
            capacity_agents: capacityAgents,
          },
          { onConflict: "mes_id" },
        ),
        client.from("volumes_chamados").upsert(
          {
            mes_id: mesId,
            webchat_volumes: webchatVolumes,
            whatsapp_volumes: whatsappVolumes,
          },
          { onConflict: "mes_id" },
        ),
        client.from("parametros_operacionais").upsert(
          {
            mes_id: mesId,
            tma_factors: tmaFactors,
            simultaneous_wc: simultaneousWC,
            simultaneous_wa: simultaneousWA,
            scenarios: scenarios,
            new_hires: newHires,
          },
          { onConflict: "mes_id" },
        ),
      ]);
      console.log(`Successfully saved data for month ${monthName} before switching.`);
    } catch (err) {
      console.error(`Failed to save data for month ${monthName}:`, err);
    }
  };

  const changeActiveMonth = async (monthName: string) => {
    const client = supabase;
    if (!client) {
      setCurrentMonth(monthName);
      return;
    }

    try {
      setIsLoading(true);
      // Salva imediatamente o mês atual para garantir que nenhuma edição recente seja perdida
      await saveMonthDataToSupabase(currentMonth);
      await loadMonthDataFromSupabase(monthName);
      setCurrentMonth(monthName);
    } catch (err) {
      console.error(`Failed to change month to ${monthName}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewMonth = async (newMonthName: string) => {
    const client = supabase;
    if (!client) {
      setAvailableMonths((prev) => [...prev, newMonthName]);
      setCurrentMonth(newMonthName);
      return;
    }

    try {
      setIsLoading(true);
      // Salva imediatamente o mês atual antes de criar e chavear para o novo
      await saveMonthDataToSupabase(currentMonth);

      const { data: newMonth, error: insertError } = await client
        .from("meses")
        .insert([{ nome: newMonthName }])
        .select()
        .single();

      if (insertError) throw insertError;
      const newMesId = newMonth.id;

      const emptyWcVolumes: Record<string, Record<Day, number>> = {};
      const emptyWaVolumes: Record<string, Record<Day, number>> = {};

      timeBlocks.forEach((time) => {
        emptyWcVolumes[time] = {} as Record<Day, number>;
        emptyWaVolumes[time] = {} as Record<Day, number>;
        DAYS.forEach((day) => {
          emptyWcVolumes[time][day] = 0;
          emptyWaVolumes[time][day] = 0;
        });
      });

      await Promise.all([
        client.from("escala_equipe").insert([
          {
            mes_id: newMesId,
            team_agents: teamAgents,
            capacity_agents: capacityAgents,
          },
        ]),
        client.from("volumes_chamados").insert([
          {
            mes_id: newMesId,
            webchat_volumes: emptyWcVolumes,
            whatsapp_volumes: emptyWaVolumes,
          },
        ]),
        client.from("parametros_operacionais").insert([
          {
            mes_id: newMesId,
            tma_factors: tmaFactors,
            simultaneous_wc: simultaneousWC,
            simultaneous_wa: simultaneousWA,
            scenarios: scenarios,
            new_hires: newHires.map((nh) => ({ ...nh, active: true })),
          },
        ]),
      ]);

      const { data: monthsData, error: monthsError } = await client
        .from("meses")
        .select("nome")
        .order("created_at", { ascending: true });

      if (monthsError) throw monthsError;

      const updatedMonths = monthsData.map((m: any) => m.nome);
      setAvailableMonths(updatedMonths);
      setCurrentMonth(newMonthName);
      setWebchatVolumes(emptyWcVolumes);
      setWhatsappVolumes(emptyWaVolumes);
    } catch (err) {
      console.error(`Failed to create month ${newMonthName}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  // Functions to edit state
  const updateTimeBlockVolume = (
    time: string,
    day: Day,
    channel: "webchat" | "whatsapp",
    value: number,
  ) => {
    const targetSetter = channel === "webchat" ? setWebchatVolumes : setWhatsappVolumes;
    targetSetter((prev) => ({
      ...prev,
      [time]: {
        ...prev[time],
        [day]: Math.max(0, value),
      },
    }));
  };

  const updateTimeBlockAgents = (time: string, day: Day, value: number) => {
    setAgentsScheduled((prev) => ({
      ...prev,
      [time]: {
        ...prev[time],
        [day]: Math.max(0, Math.round(value)),
      },
    }));
  };

  const updateTmaFactor = (day: Day, value: number) => {
    setTmaFactors((prev) => ({
      ...prev,
      [day]: Math.max(0.1, value),
    }));
  };

  const updateSimultaneous = (channel: "webchat" | "whatsapp", value: number) => {
    if (channel === "webchat") {
      setSimultaneousWC(Math.max(1, value));
    } else {
      setSimultaneousWA(Math.max(1, value));
    }
  };

  const updateScenario = (key: keyof ScenarioParams, value: number) => {
    setScenarios((prev) => ({
      ...prev,
      [key]: Math.max(0, value),
    }));
  };

  const toggleIntervalStatus = (agentId: string, day: Day, time20: string) => {
    setTeamAgents((prev) =>
      prev.map((agent) => {
        if (agent.id !== agentId) return agent;
        const schedules = { ...agent.schedules };
        const daySched = schedules[day] ? { ...schedules[day] } : { intervals: {} };
        const intervals = { ...daySched.intervals };

        const current = intervals[time20] || "folga";
        let nextStatus: IntervalStatus = "folga";
        if (current === "folga") nextStatus = "trabalhando";
        else if (current === "trabalhando") nextStatus = "externo";
        else if (current === "externo") nextStatus = "pausa";
        else if (current === "pausa") nextStatus = "folga";

        if (nextStatus === "folga") {
          delete intervals[time20];
        } else {
          intervals[time20] = nextStatus;
        }

        schedules[day] = { intervals };
        return { ...agent, schedules };
      }),
    );
  };

  const applyPresetShift = (
    agentId: string,
    day: Day,
    start: string,
    end: string,
    lunchStart: string,
    externalStart?: string,
    externalDurationMin?: number,
  ) => {
    setTeamAgents((prev) =>
      prev.map((agent) => {
        if (agent.id !== agentId) return agent;
        const schedules = { ...agent.schedules };

        const intervals: Record<string, IntervalStatus> = {};

        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);
        const [lunchH, lunchM] = lunchStart.split(":").map(Number);

        const startMin = startH * 60 + startM;
        let endMin = endH * 60 + endM;
        if (endMin < startMin) endMin += 24 * 60; // night shift

        const lunchStartMin = lunchH * 60 + lunchM;
        const lunchEndMin = lunchStartMin + 60; // 1 hour

        let extStartMin = -1;
        let extEndMin = -1;
        if (externalStart && externalDurationMin && externalDurationMin > 0) {
          const [extH, extM] = externalStart.split(":").map(Number);
          extStartMin = extH * 60 + extM;
          extEndMin = extStartMin + externalDurationMin;
        }

        let t = startMin;
        while (t < endMin) {
          const currentMin = t % (24 * 60);
          const h = Math.floor(currentMin / 60);
          const m = currentMin % 60;
          const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

          let status: IntervalStatus = "trabalhando";

          if (t >= lunchStartMin && t < lunchEndMin) {
            status = "pausa";
          } else if (extStartMin !== -1) {
            let isExternal = false;
            let checkExtEnd = extEndMin;
            const checkT = t;
            if (extEndMin < extStartMin) {
              checkExtEnd += 24 * 60;
            }
            if (
              checkT < extStartMin &&
              checkT + 24 * 60 >= extStartMin &&
              checkT + 24 * 60 < checkExtEnd
            ) {
              isExternal = true;
            } else if (checkT >= extStartMin && checkT < checkExtEnd) {
              isExternal = true;
            }

            if (isExternal) {
              status = "externo";
            }
          }

          intervals[timeStr] = status;
          t += 20;
        }

        schedules[day] = { intervals };
        return { ...agent, schedules };
      }),
    );
  };

  const toggleAgentActive = (agentId: string) => {
    setTeamAgents((prev) =>
      prev.map((agent) => (agent.id === agentId ? { ...agent, active: !agent.active } : agent)),
    );
  };

  const addTeamAgent = (name: string) => {
    const newAgent: TeamAgent = {
      id: "a_" + Date.now(),
      name,
      active: true,
      schedules: {},
    };
    setTeamAgents((prev) => [...prev, newAgent]);
  };

  const removeTeamAgent = (agentId: string) => {
    setTeamAgents((prev) => prev.filter((agent) => agent.id !== agentId));
  };

  const updateTeamAgentName = (agentId: string, newName: string) => {
    let oldName = "";
    setTeamAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          oldName = agent.name;
          return { ...agent, name: newName };
        }
        return agent;
      }),
    );

    if (oldName) {
      setCapacityAgents((prev) =>
        prev.map((ca) => (matchAgentName(ca.name, oldName) ? { ...ca, name: newName } : ca)),
      );
    }
  };

  const updateCapacityAgent = (name: string, value: number) => {
    setCapacityAgents((prev) => {
      const index = prev.findIndex((a) => matchAgentName(a.name, name));
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], mediaTri: Math.max(0, value) };
        return updated;
      } else {
        return [...prev, { name, mediaTri: Math.max(0, value) }];
      }
    });
  };

  const resetAll = () => {
    setWebchatVolumes(initialData.webchatVolumes);
    setWhatsappVolumes(initialData.whatsappVolumes);
    setAgentsScheduled(initialData.agentsScheduled);
    setTeamAgents(INITIAL_TEAM_AGENTS);
    setTmaFactors(DEFAULT_TMA_FACTORS);
    setCapacityAgents(initialCapacityAgents);
    setSimultaneousWC(3);
    setSimultaneousWA(4);
    setScenarios({
      clientBase: 3580,
      contactRate: 6.2,
      turnoverRate: 2.0,
      slaTarget: 95,
    });
    setNewHires([
      {
        id: "h1",
        name: "Agente Contratado 1",
        start_time: "09:00",
        end_time: "18:00",
        days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
        active: true,
      },
      {
        id: "h2",
        name: "Agente Contratado 2",
        start_time: "10:00",
        end_time: "19:00",
        days: ["Segunda", "Terça", "Quinta", "Sexta", "Sábado"],
        active: true,
      },
      {
        id: "h3",
        name: "Agente Contratado 3",
        start_time: "11:00",
        end_time: "20:00",
        days: ["Segunda", "Quarta", "Quinta", "Sexta", "Domingo"],
        active: true,
      },
      {
        id: "h4",
        name: "Agente Contratado 4",
        start_time: "12:00",
        end_time: "21:00",
        days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
        active: true,
      },
    ]);
  };

  // Helper to verify if a time string is within an agent's 9-hour shift
  const isTimeInShift = (time: string, start: string, end: string): boolean => {
    const [h, m] = time.split(":").map(Number);
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    const val = h * 60 + m;
    const startVal = startH * 60 + startM;
    let endVal = endH * 60 + endM;

    // Handle night shift crossing 00:00
    if (endVal < startVal) {
      endVal += 24 * 60;
      const nextDayVal = val + 24 * 60;
      return (val >= startVal && val < 24 * 60) || (nextDayVal >= startVal && nextDayVal < endVal);
    }

    return val >= startVal && val < endVal;
  };

  // Compute dynamic Capacity/Webchat for each day of the week based on schedules and capacityAgent volumes
  const dynamicTmaFactors = useMemo(() => {
    const isAgentScheduledOnDay = (agent: TeamAgent, day: Day) => {
      if (!agent.active || !agent.schedules[day]) return false;
      return Object.values(agent.schedules[day]!.intervals).some(
        (s) => s === "trabalhando" || s === "externo" || s === "pausa",
      );
    };

    const deriveResolvidos10Local = (mediaTri: number) => {
      const mediaMes = mediaTri / 3;
      const resolvidosDia = Math.ceil(mediaMes / 20);
      const resolvidosHora = resolvidosDia / 8; // SHIFT_HOURS = 8
      return resolvidosHora / 6; // resolvidos10
    };

    // Yooga Suporte capacity
    const supportMatch = capacityAgents.find((ca) => ca.name === "Yooga Suporte");
    const supportMediaTri = supportMatch ? supportMatch.mediaTri : 1500;
    const supportResolvidos10 = deriveResolvidos10Local(supportMediaTri);

    // Care AI capacity
    const aiMatch = capacityAgents.find((ca) => ca.name === "Care AI");
    const aiMediaTri = aiMatch ? aiMatch.mediaTri : 1500;
    const aiResolvidos10 = deriveResolvidos10Local(aiMediaTri);

    const factors = {} as Record<Day, number>;

    DAYS.forEach((day) => {
      // Filter active human agents scheduled on this day
      const scheduledHumans = teamAgents.filter(
        (agent) => agent.active && isAgentScheduledOnDay(agent, day),
      );

      const humanSum = scheduledHumans.reduce((sum, agent) => {
        const capMatch = capacityAgents.find((ca) => matchAgentName(ca.name, agent.name));
        const mediaTri = capMatch ? capMatch.mediaTri : 1500;
        return sum + deriveResolvidos10Local(mediaTri);
      }, 0);

      const totalResolvidos10 = humanSum + supportResolvidos10 + aiResolvidos10;
      const divisor = scheduledHumans.length;

      // Capacity/Webchat = totalResolvidos10 / (divisor + 1) rounded to 2 decimal places to avoid floating point compounding errors
      factors[day] = Math.round((totalResolvidos10 / Math.max(divisor + 1, 1)) * 100) / 100;
    });

    return factors;
  }, [teamAgents, capacityAgents]);

  // Centralized calculations engine
  const { rowCalculations, totals, kpis } = useMemo(() => {
    let totalWcVolume = 0;
    let totalWcCapacity = 0;
    let totalWaVolume = 0;
    let totalWaCapacity = 0;
    let totalDeficit10 = 0;
    let totalDeficit20 = 0;
    let totalPrDeficit10 = 0;
    let totalSurplus = 0;

    const computedTotals = {} as Record<
      Day,
      {
        wcVolume: number;
        wcCapacity: number;
        waVolume: number;
        waCapacity: number;
        waDeficit10: number;
        prCapacity: number;
        prDeficit10: number;
      }
    >;

    DAYS.forEach((day) => {
      computedTotals[day] = {
        wcVolume: 0,
        wcCapacity: 0,
        waVolume: 0,
        waCapacity: 0,
        waDeficit10: 0,
        prCapacity: 0,
        prDeficit10: 0,
      };
    });

    const list: RowCalculation[] = timeBlocks.map((time) => {
      const rowResult = {
        time,
        webchat: {},
        whatsapp: {},
        provaReal: {},
      } as RowCalculation;

      DAYS.forEach((day) => {
        const factorWC = dynamicTmaFactors[day];
        const factorWA = factorWC * (simultaneousWA / simultaneousWC);

        const volWC = webchatVolumes[time]?.[day] ?? 0;
        const volWA = whatsappVolumes[time]?.[day] ?? 0;

        // Current scheduled agents in this 10m block calculated dynamically from team schedules
        const agentsSch = teamAgents.reduce((count, agent) => {
          if (agent.active && agent.schedules[day]) {
            const [h, m] = time.split(":").map(Number);
            const m20 = Math.floor(m / 20) * 20;
            const time20 = `${h.toString().padStart(2, "0")}:${m20.toString().padStart(2, "0")}`;
            const status = agent.schedules[day]!.intervals[time20] || "folga";
            if (status === "trabalhando") {
              return count + 1;
            }
          }
          return count;
        }, 0);

        // --- WEBCHAT CALCULATIONS ---
        const capWcRaw = agentsSch * factorWC;
        const capWcRounded = Math.ceil(capWcRaw);
        const wcSurplus = capWcRounded - volWC;
        // Released agents for WhatsApp (floor of surplus / 3 síncronos)
        const wcAgentsForWhats = wcSurplus > 0 ? Math.floor(wcSurplus / simultaneousWC) : 0;

        // --- WHATSAPP CALCULATIONS ---
        const capWaRaw = wcAgentsForWhats * factorWA;
        const capWaRounded = Math.ceil(capWaRaw);
        const waSurplus = capWaRounded - volWA;

        // Deficit in chats
        const waDeficitChats = Math.max(0, volWA - capWaRounded);
        // Missing agents to cover this deficit (divided by 4/8 concurrent chats limit)
        const waFaltam10 = Math.ceil(waDeficitChats / simultaneousWA);
        const waFaltam20 = Math.ceil(waDeficitChats / (simultaneousWA * 2));

        // --- PROVA REAL SIMULATION (WITH NEW HIRES IN SHIFT) ---
        // Count how many new active hires are in this block/day
        const activeNewHires = newHires.reduce((count, hire) => {
          if (
            hire.active &&
            hire.days.includes(day) &&
            isTimeInShift(time, hire.start_time, hire.end_time)
          ) {
            return count + 1;
          }
          return count;
        }, 0);

        const totalAgentsPR = agentsSch + activeNewHires;

        // Redo cascading calculations with new staffing total
        const prCapWcRaw = totalAgentsPR * factorWC;
        const prCapWcRounded = Math.ceil(prCapWcRaw);
        const prWcSurplus = prCapWcRounded - volWC;
        const prWcAgentsForWhats = prWcSurplus > 0 ? Math.floor(prWcSurplus / simultaneousWC) : 0;

        const prCapWaRaw = prWcAgentsForWhats * factorWA;
        const prCapWaRounded = Math.ceil(prCapWaRaw);
        const prWaDeficitChats = Math.max(0, volWA - prCapWaRounded);
        const prFaltam10 = Math.ceil(prWaDeficitChats / simultaneousWA);
        const prFaltam20 = Math.ceil(prWaDeficitChats / (simultaneousWA * 2));

        // Accumulate row calculations for day
        computedTotals[day].wcVolume += volWC;
        computedTotals[day].wcCapacity += capWcRounded;
        computedTotals[day].waVolume += volWA;
        computedTotals[day].waCapacity += capWaRounded;
        computedTotals[day].waDeficit10 += waFaltam10;
        computedTotals[day].prCapacity += prCapWaRounded;
        computedTotals[day].prDeficit10 += prFaltam10;

        // Accumulate global KPIs
        totalWcVolume += volWC;
        totalWcCapacity += capWcRounded;
        totalWaVolume += volWA;
        totalWaCapacity += capWaRounded;
        totalDeficit10 += waFaltam10;
        totalDeficit20 += waFaltam20;
        totalPrDeficit10 += prFaltam10;
        totalSurplus += Math.max(0, wcSurplus) + Math.max(0, waSurplus);

        // Store calculations for this specific day/time block
        // In this object structures we map calculations dynamically
        if (!rowResult.webchat) {
          rowResult.webchat = {
            volume: 0,
            capacityRaw: 0,
            capacityRounded: 0,
            surplus: 0,
            agentsForWhats: 0,
          };
        }

        // Instead of day-specific nested grids, we do a flat map row structures for ease of component binding,
        // but to preserve sheet shape compatibility we store them as keyed maps inside rowResult!
        // Yes, to allow TimeGridSheet to render cleanly:
        // We initialize them as arrays corresponding to DAYS indexes!
        if (!(rowResult as any).volume) {
          // Initialize arrays for 7 days
          (rowResult as any).volume = [];
          (rowResult as any).capacity = [];
          (rowResult as any).capacityR = [];
          (rowResult as any).resultado = [];
          (rowResult as any).agentsWhats = [];
          (rowResult as any).waVolume = [];
          (rowResult as any).waCapacity = [];
          (rowResult as any).waCapacityR = [];
          (rowResult as any).waResultado = [];
          (rowResult as any).waFaltam10 = [];
          (rowResult as any).waFaltam20 = [];
          (rowResult as any).prCapacity = [];
          (rowResult as any).prCapacityR = [];
          (rowResult as any).prResultado = [];
          (rowResult as any).prFaltam10 = [];
          (rowResult as any).prFaltam20 = [];
        }

        const dIdx = DAYS.indexOf(day);
        (rowResult as any).volume[dIdx] = volWC;
        (rowResult as any).capacity[dIdx] = capWcRaw;
        (rowResult as any).capacityR[dIdx] = capWcRounded;
        (rowResult as any).resultado[dIdx] = wcSurplus;
        (rowResult as any).agentsWhats[dIdx] = wcAgentsForWhats;

        // WhatsApp Resultado in terms of chats: Capacity Arredondado - Volume
        (rowResult as any).waVolume[dIdx] = volWA;
        (rowResult as any).waCapacity[dIdx] = capWaRaw;
        (rowResult as any).waCapacityR[dIdx] = capWaRounded;
        (rowResult as any).waResultado[dIdx] = waSurplus;
        (rowResult as any).waFaltam10[dIdx] = waFaltam10;
        (rowResult as any).waFaltam20[dIdx] = waFaltam20;

        // Prova Real Resultado in terms of chats: Capacity Arredondado - Volume
        (rowResult as any).prCapacity[dIdx] = prCapWaRaw;
        (rowResult as any).prCapacityR[dIdx] = prCapWaRounded;
        (rowResult as any).prResultado[dIdx] = prCapWaRounded - volWA;
        (rowResult as any).prFaltam10[dIdx] = prFaltam10;
        (rowResult as any).prFaltam20[dIdx] = prFaltam20;
      });

      return rowResult;
    });

    return {
      rowCalculations: list,
      totals: computedTotals,
      kpis: {
        webchatVolume: totalWcVolume,
        webchatCapacity: totalWcCapacity,
        whatsappVolume: totalWaVolume,
        whatsappCapacity: totalWaCapacity,
        totalDeficit10: totalDeficit10,
        totalDeficit20: totalDeficit20,
        provaRealDeficit10: totalPrDeficit10,
        excedenteTotal: totalSurplus,
      },
    };
  }, [
    timeBlocks,
    webchatVolumes,
    whatsappVolumes,
    teamAgents,
    dynamicTmaFactors,
    simultaneousWC,
    simultaneousWA,
    newHires,
  ]);

  // Client-side direct CSV Power BI ingestion
  const importPowerBIData = (webchatCsv: string, whatsappCsv: string): boolean => {
    try {
      const parseCsv = (csv: string): Record<string, Record<Day, number>> => {
        const lines = csv
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const data: Record<string, Record<Day, number>> = {};

        // Find header line (must contain seg, ter, etc.)
        let headerIdx = -1;
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const l = lines[i].toLowerCase();
          if (l.includes("seg") || l.includes("ter") || l.includes("qua") || l.includes("volume")) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) throw new Error("Header não encontrado");

        const rawHeaders = lines[headerIdx].split(/[;,\t]/).map((h) => h.trim().toLowerCase());

        // Identify day columns
        const dayCols: Record<Day, number> = {} as Record<Day, number>;
        const dayShorts: Record<string, Day> = {
          seg: "Segunda",
          ter: "Terça",
          qua: "Quarta",
          qui: "Quinta",
          sex: "Sexta",
          sab: "Sábado",
          sáb: "Sábado",
          dom: "Domingo",
        };

        rawHeaders.forEach((h, idx) => {
          Object.keys(dayShorts).forEach((short) => {
            if (h.includes(short)) {
              dayCols[dayShorts[short]] = idx;
            }
          });
        });

        // Parse volume data rows
        for (let i = headerIdx + 1; i < lines.length; i++) {
          const cells = lines[i].split(/[;,\t]/).map((c) => c.trim());
          if (cells.length < 2) continue;

          // First column is usually the Time
          let timeVal = cells[0];
          // Standardize time formatting HH:MM:SS to HH:MM
          if (timeVal.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
            const parts = timeVal.split(":");
            const hh = parts[0].padStart(2, "0");
            const mm = parts[1];
            timeVal = `${hh}:${mm}:00`; // standard spreadsheet format
          } else {
            continue; // skip dirty lines
          }

          data[timeVal] = {} as Record<Day, number>;
          DAYS.forEach((day) => {
            const colIdx = dayCols[day];
            let val = 0;
            if (colIdx !== undefined && cells[colIdx]) {
              val = Number(cells[colIdx].replace(",", ".")) || 0;
            }
            // Ingestion logic step 5: Division by 13 weeks (90 days average)
            data[timeVal][day] = Math.max(0, val / 13);
          });
        }
        return data;
      };

      if (webchatCsv) {
        const wcData = parseCsv(webchatCsv);
        setWebchatVolumes((prev) => {
          const updated = { ...prev };
          Object.keys(wcData).forEach((t) => {
            if (updated[t]) updated[t] = wcData[t];
          });
          return updated;
        });
      }

      if (whatsappCsv) {
        const waData = parseCsv(whatsappCsv);
        setWhatsappVolumes((prev) => {
          const updated = { ...prev };
          Object.keys(waData).forEach((t) => {
            if (updated[t]) updated[t] = waData[t];
          });
          return updated;
        });
      }

      return true;
    } catch (err) {
      console.error("Error parsing Power BI report:", err);
      return false;
    }
  };

  const updateChannelVolumes = (
    channel: "webchat" | "whatsapp",
    newVolumes: Record<string, Record<Day, number>>,
  ) => {
    const targetSetter = channel === "webchat" ? setWebchatVolumes : setWhatsappVolumes;
    targetSetter((prev) => {
      const updated = { ...prev };
      Object.keys(newVolumes).forEach((t) => {
        if (updated[t]) {
          updated[t] = {
            ...updated[t],
            ...newVolumes[t],
          };
        } else {
          updated[t] = newVolumes[t];
        }
      });
      return updated;
    });
  };

  return (
    <DimensionamentoContext.Provider
      value={{
        rowCalculations,
        totals,
        kpis,
        tmaFactors: dynamicTmaFactors,
        simultaneousWC,
        simultaneousWA,
        teamAgents,
        newHires,
        scenarios,
        capacityAgents,
        currentMonth,
        availableMonths,
        isLoading,
        changeActiveMonth,
        createNewMonth,
        updateTimeBlockVolume,
        updateTimeBlockAgents,
        updateTmaFactor,
        updateSimultaneous,
        setTeamAgents,
        toggleIntervalStatus,
        applyPresetShift,
        toggleAgentActive,
        addTeamAgent,
        removeTeamAgent,
        updateTeamAgentName,
        setNewHires,
        updateScenario,
        updateCapacityAgent,
        resetAll,
        importPowerBIData,
        updateChannelVolumes,
      }}
    >
      {children}
    </DimensionamentoContext.Provider>
  );
};

export const useDimensionamento = () => {
  const context = useContext(DimensionamentoContext);
  if (context === undefined) {
    throw new Error("useDimensionamento must be used within a DimensionamentoProvider");
  }
  return context;
};
