import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned action: a link ("Vedi tutti") or a button. */
  action?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}

/** Title row above a card or a group of cards. */
export function SectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-3 px-1 pb-2.5",
        className
      )}
    >
      <div className="min-w-0">
        <Heading className="text-section">{title}</Heading>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
