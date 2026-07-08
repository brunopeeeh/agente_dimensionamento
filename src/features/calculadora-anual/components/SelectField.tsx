type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  disabled?: boolean;
};

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
}: Props<T>) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full cursor-pointer rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
