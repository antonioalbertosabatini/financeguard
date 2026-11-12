import { CategoryIcon } from "@/components/categories/category-icon";
import { cn } from "@/lib/utils";

interface CategoryBadgeIconProps {
  icon?: string;
  color?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Rounded tile with a category's icon on a soft tint of its own colour.
 * Used in transaction rows, budget rows and the dashboard.
 */
export function CategoryBadgeIcon({
  icon,
  color,
  className,
  iconClassName = "size-[1.125rem]",
}: CategoryBadgeIconProps) {
  const tint = color ?? "var(--muted-foreground)";
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", className)}
      style={{ backgroundColor: `color-mix(in oklch, ${tint} 15%, transparent)` }}
    >
      <CategoryIcon name={icon ?? "circle"} color={tint} className={iconClassName} />
    </span>
  );
}
