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
        <Badge key={tag} variant="outline" className="gap-1">
          <Tag className="size-3" />
          {tag}
        </Badge>
      ))}
    </div>
  );
}
