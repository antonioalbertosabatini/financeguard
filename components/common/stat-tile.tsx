import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatTone = "primary" | "success" | "danger" | "warning" | "info" | "neutral";

const ICON_TONE: Record<StatTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-2 text-muted-foreground",
};

interface StatTileProps {
  label: string;
  /** Usually an <Amount />. */
  value: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Secondary line, e.g. a delta vs. the previous period. */
  hint?: ReactNode;
  /** "stacked": icon above (grid tiles); "inline": icon at the left (rows). */
  layout?: "stacked" | "inline";
  className?: string;
}

/** Compact KPI card: icon, label, big value, optional hint. */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  layout = "stacked",
  className,
}: StatTileProps) {
  const icon = Icon && (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl",
        ICON_TONE[tone]
      )}
    >
      <Icon className="size-[1.125rem]" aria-hidden="true" />
    </span>
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-soft",
        layout === "inline" && "flex items-center gap-3.5",
        className
      )}
    >
      {icon}
      <div className={cn("min-w-0", layout === "stacked" && Icon && "mt-3", layout === "inline" && "flex-1")}>
        <p className="text-[0.8125rem] text-muted-foreground">{label}</p>
        <div className="mt-0.5 truncate text-xl font-bold tracking-tight tabular-nums sm:text-[1.375rem]">
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs font-semibold text-muted-foreground">{hint}</div>
        )}
      </div>
    </div>
  );
}
