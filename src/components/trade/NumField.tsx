import { cn } from "@/lib/utils";

/** Labeled numeric input used in order forms (OKX style: label left, unit right). */
export function NumField({
  label,
  unit,
  value,
  onChange,
  disabled,
  placeholder,
  right,
}: {
  label: string;
  unit?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  right?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm transition-colors focus-within:border-foreground",
        disabled && "bg-muted opacity-70",
      )}
    >
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value.replace(/,/g, ".");
          if (v === "" || /^\d*\.?\d*$/.test(v)) onChange(v);
        }}
        className="tabular min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-muted-foreground"
        aria-label={label}
      />
      {right}
      {unit && <span className="shrink-0 text-xs font-medium">{unit}</span>}
    </label>
  );
}

/** 0–100% quick-fill slider with notches. */
export function PctSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="py-1">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-[var(--foreground)]"
        aria-label="Percentage of available balance"
      />
      <div className="mt-1 flex justify-between">
        {[0, 25, 50, 75, 100].map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            className={cn(
              "rounded px-1.5 text-[11px]",
              value === p ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p}%
          </button>
        ))}
      </div>
    </div>
  );
}
