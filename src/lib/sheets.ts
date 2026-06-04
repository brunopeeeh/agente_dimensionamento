import raw from "@/data/sheets.json";

export type Cell = string | number | null;
export type SheetRow = Cell[];
export type SheetData = Record<string, SheetRow[]>;

export const sheets = raw as SheetData;

export const SHEET_KEYS = {
  capacity: "Capacity p dia - Fevereiro26",
  webchat: "Fevereiro-26-Webchat",
  whatsapp: "Fevereiro-26-Whatsapp",
  prova: "Prova Real-Contratações-Feverei",
} as const;

export const fmtNum = (v: unknown, digits = 2) => {
  if (typeof v !== "number" || !isFinite(v)) return "";
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(digits);
};
