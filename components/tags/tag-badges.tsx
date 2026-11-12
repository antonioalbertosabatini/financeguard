import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TagBadgesProps = {
  tags: string[];
  className?: string;
  emptyPlaceholder?: string;
};

export function TagBadges({
  tags,
  className,
  emptyPlaceholder = "—",
}: TagBadgesProps) {
  if (tags.length === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyPlaceholder}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="h-5 gap-1 px-2 font-medium text-muted-foreground">
          <Tag className="size-3" aria-hidden="true" />
          {tag}
        </Badge>
      ))}
    </div>
  );
}
