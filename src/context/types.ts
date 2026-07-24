import type React from "react";

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
  isSimulated?: boolean;
};

export type NewAgentHire = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  lunch_start_time?: string;
  days: Day[];
  active: boolean;
  schedules?: Partial<Record<Day, AgentSchedule>>;
};

export type CapacityAgent = {
  name: string;
  mediaTri: number;
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type ScenarioParams = {
  clientBase: number;
  contactRate: number;
  turnoverRate: number;
  slaTarget: number;
};

export type RowCalculation = {
  time: string;
  volume: number[];
  capacity: number[];
  capacityR: number[];
  resultado: number[];
  agentsWhats: number[];
  waVolume: number[];
  waCapacity: number[];
  waCapacityR: number[];
  waResultado: number[];
  waFaltam10: number[];
  waFaltam20: number[];
  prCapacity: number[];
  prCapacityR: number[];
  prResultado: number[];
  prFaltam10: number[];
  prFaltam20: number[];
};

export type DayTotals = {
  wcVolume: number;
  wcCapacity: number;
  waVolume: number;
  waCapacity: number;
  waDeficit10: number;
  prCapacity: number;
  prDeficit10: number;
};

export type DimensionamentoKpis = {
  webchatVolume: number;
  webchatCapacity: number;
  whatsappVolume: number;
  whatsappCapacity: number;
  totalDeficit10: number;
  totalDeficit20: number;
  provaRealDeficit10: number;
  excedenteTotal: number;
  picoMaximo: { day: string; time: string; deficit: number };
  horasOciosas: number;
  coberturaProjetada: number;
};

export type DimensionamentoState = {
  rowCalculations: RowCalculation[];
  totals: Record<Day, DayTotals>;
  kpis: DimensionamentoKpis;
  timeBlocks: string[];
  webchatVolumes: Record<string, Record<Day, number>>;
  whatsappVolumes: Record<string, Record<Day, number>>;
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
  saveStatus: SaveStatus;
  isReadOnly: boolean;
  setIsReadOnly: (val: boolean) => void;
  changeActiveMonth: (monthName: string) => Promise<void>;
  createNewMonth: (newMonthName: string) => Promise<void>;
  refreshCurrentMonth: () => Promise<void>;
  updateTimeBlockVolume: (
    time: string,
    day: Day,
    channel: "webchat" | "whatsapp",
    value: number,
  ) => void;
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
  isResetConfirmOpen: boolean;
  setIsResetConfirmOpen: (val: boolean) => void;
  executeResetAll: () => Promise<void>;
  importPowerBIData: (webchatCsv: string, whatsappCsv: string) => boolean;
  updateChannelVolumes: (
    channel: "webchat" | "whatsapp",
    newVolumes: Record<string, Record<Day, number>>,
  ) => void;
};
