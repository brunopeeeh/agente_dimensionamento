import type { PrefillFieldSource } from "../derivePlannerDefaults";

/** Indica que o campo veio dos dados reais da operação (ou foi estimado a partir deles). */
export function PrefillBadge({ source }: { source?: PrefillFieldSource }) {
  if (!source || source === "preset") return null;
  const isReal = source === "real";
  return (
    <span
      title={
        isReal
          ? "Pré-preenchido com dados reais da operação"
          : "Estimado a partir dos dados da operação — confirme o valor"
      }
      className={`rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ${
        isReal
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
      }`}
    >
      {isReal ? "dado real" : "estimado"}
    </span>
  );
}
