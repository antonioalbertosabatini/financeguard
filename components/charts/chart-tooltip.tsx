"use client";

import { useFormatCents } from "@/hooks/use-format-cents";

type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown> & { color?: string; name?: string };
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  currency: string;
  locale: string;
  /**
   * Chart values are often expressed in euros (cents / 100). Set the scale used
   * to bring a value back to cents before formatting. Use 1 when values are
   * already in cents (e.g. pie charts fed directly with cent amounts).
   */
  valueScale?: number;
  /** Optional formatter for the tooltip header (e.g. `Giorno 12`). */
  labelFormatter?: (label: string | number) => string;
  /** Hide the header row entirely (useful for single-series charts). */
  hideLabel?: boolean;
};

/**
 * Shared, theme-aware tooltip for every Recharts chart in the app.
 * Amount masking is handled by `useFormatCents`, so hidden amounts render as `••`.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  currency,
  locale,
  valueScale = 100,
  labelFormatter,
  hideLabel,
}: ChartTooltipProps) {
  const formatAmount = useFormatCents();

  if (!active || !payload?.length) return null;

  const items = payload.filter((entry) => entry.value != null);
  if (items.length === 0) return null;

  const headerText =
    !hideLabel && label != null
      ? labelFormatter
        ? labelFormatter(label)
        : String(label)
      : null;

  return (
    <div className="max-w-[16rem] rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      {headerText && (
        <p className="mb-1 font-medium text-foreground">{headerText}</p>
      )}
      <ul className="space-y-1">
        {items.map((entry, index) => {
          const color = entry.payload?.color ?? entry.color ?? "var(--muted-foreground)";
          const name = entry.name ?? entry.payload?.name ?? "";
          return (
            <li
              key={`${entry.dataKey ?? name}-${index}`}
              className="flex items-center gap-2"
            >
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {name !== "" && (
                <span className="min-w-0 truncate text-muted-foreground">
                  {name}
                </span>
              )}
              <span className="ml-auto pl-2 font-medium tabular-nums text-foreground">
                {formatAmount(Number(entry.value) * valueScale, currency, locale)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
