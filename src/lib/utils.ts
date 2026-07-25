import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtNum(v: unknown, digits = 2) {
  if (typeof v !== "number" || !isFinite(v)) return "";
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(digits).replace(".", ",");
}
