"use client";

import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterChipProps
  extends Omit<ComponentProps<"button">, "children"> {
  children: ReactNode;
  /** Toggle chip state (aria-pressed). */
  active?: boolean;
  /** Shows an × and means "click removes this filter". Use with a descriptive aria-label. */
  removable?: boolean;
}

/**
 * Accessible filter chip: a real <button>, keyboard operable, with
 * aria-pressed for toggles. Never nest another interactive element inside.
 */
export function FilterChip({
  children,
  active = false,
  removable = false,
  className,
  type = "button",
  ...props
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={removable ? undefined : active}
      className={cn(
        "pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active || removable
          ? "border-transparent bg-primary-soft text-primary-soft-foreground"
          : "border-border bg-card text-foreground hover:bg-surface-2",
        className
      )}
      {...props}
    >
      {children}
      {removable && <X className="-mr-1 size-3.5 opacity-70" aria-hidden="true" />}
    </button>
  );
}
