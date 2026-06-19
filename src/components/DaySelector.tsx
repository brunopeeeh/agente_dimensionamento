import { DAYS, Day } from "@/context/DimensionamentoContext";

export type DaySelectorValue = Day | "Todos" | string;

type DaySelectorProps = {
  value: DaySelectorValue;
  onChange: (day: Day | "Todos") => void;
  variant?: "pill" | "tab" | "compact";
  includeAll?: boolean;
  allLabel?: string;
  className?: string;
  getBadge?: (day: Day) => number | undefined;
  extraTabs?: readonly { id: string; label: string }[];
  onExtraTabSelect?: (id: string) => void;
};

const variantClasses = {
  pill: {
    base: "px-3 py-1 text-xs font-semibold border transition-all",
    active: "bg-primary text-primary-foreground border-primary",
    inactive:
      "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
  },
  tab: {
    base: "px-4 py-2 text-xs font-bold transition-all rounded-none border-b-2 -mb-[2px]",
    active: "border-primary text-foreground bg-muted/40 font-extrabold",
    inactive: "border-transparent text-muted-foreground hover:text-foreground",
  },
  compact: {
    base: "px-2.5 py-1 text-[11px] font-semibold border rounded-md transition-all",
    active: "bg-primary text-primary-foreground border-primary",
    inactive:
      "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
  },
} as const;

function isDaySelected(value: DaySelectorValue, day: Day, isExtraTab: boolean): boolean {
  return !isExtraTab && value === day;
}

export function DaySelector({
  value,
  onChange,
  variant = "pill",
  includeAll = false,
  allLabel = "Visão Geral",
  className = "",
  getBadge,
  extraTabs,
  onExtraTabSelect,
}: DaySelectorProps) {
  const styles = variantClasses[variant];
  const isExtraTab = extraTabs?.some((tab) => tab.id === value);

  return (
    <div className={`flex flex-wrap gap-1 select-none ${className}`}>
      {includeAll && (
        <button
          type="button"
          onClick={() => onChange("Todos")}
          className={`${styles.base} ${value === "Todos" ? styles.active : styles.inactive}`}
        >
          {allLabel}
        </button>
      )}

      {DAYS.map((day) => {
        const badge = getBadge?.(day);
        const selected = isDaySelected(value, day, !!isExtraTab);
        const label = variant === "compact" ? day.slice(0, 3) : day;

        return (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            className={`${styles.base} ${selected ? styles.active : styles.inactive}`}
          >
            {label}
            {badge !== undefined && (
              <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.2 text-muted-foreground font-medium rounded-sm">
                {badge}
              </span>
            )}
          </button>
        );
      })}

      {extraTabs?.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onExtraTabSelect?.(tab.id)}
            className={`${styles.base} ${selected ? styles.active : styles.inactive}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
