import { useState } from "react";
import {
  parseLooseNumber,
  formatNumberForDisplay,
  isTransientNumericInput,
  inferDecimalDigitsFromStep,
} from "../engine";
import type { NumberFieldFormat } from "../engine";
import type { PrefillFieldSource } from "../derivePlannerDefaults";
import { PrefillBadge } from "./PrefillBadge";

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  format?: NumberFieldFormat;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  source?: PrefillFieldSource;
  disabled?: boolean;
  /** Sem separador de milhar — para anos e códigos ("2026", não "2.026"). */
  plain?: boolean;
};

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  format = "integer",
  step,
  min,
  max,
  hint,
  source,
  disabled,
  plain = false,
}: Props) {
  // Rascunho local enquanto o usuário digita, para aceitar entradas transitórias
  // pt-BR ("1.234,5", "-", "2,") sem o valor formatado brigar com o cursor.
  const [draft, setDraft] = useState<string | null>(null);

  const digits = format === "decimal" ? inferDecimalDigitsFromStep(step ?? 0.01) : 0;
  const displayed =
    draft ?? (plain ? String(Math.round(value)) : formatNumberForDisplay(value, format, digits));

  const clampValue = (parsed: number) => {
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return next;
  };

  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
        <PrefillBadge source={source} />
      </span>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={displayed}
          disabled={disabled}
          onFocus={(e) => setDraft(e.target.value)}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            if (isTransientNumericInput(raw)) return;
            const parsed = parseLooseNumber(raw);
            if (parsed !== null && !Number.isNaN(parsed)) onChange(clampValue(parsed));
          }}
          onBlur={() => setDraft(null)}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {suffix && <span className="shrink-0 text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </label>
  );
}
