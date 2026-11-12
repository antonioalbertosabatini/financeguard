import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Call to action, e.g. a <Button>. */
  action?: ReactNode;
  /** "card" draws its own dashed surface; "plain" sits inside an existing card. */
  variant?: "card" | "plain";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "card",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-10 text-center",
        variant === "card" &&
          "rounded-xl border border-dashed border-border bg-card/60",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-[0.9375rem] font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
