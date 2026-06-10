import { formatCents } from "@/lib/utils/money";

type CategoryAmount = {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
};

type CategoryBreakdownProps = {
  categories: CategoryAmount[];
  currency: string;
  locale: string;
  emptyMessage?: string;
};

export function CategoryBreakdown({
  categories,
  currency,
  locale,
  emptyMessage = "Nessuna spesa",
}: CategoryBreakdownProps) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const total = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <ul className="space-y-4">
      {categories.map((c) => {
        const percent = total > 0 ? (c.amount / total) * 100 : 0;
        return (
          <li key={c.categoryId} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate font-medium">{c.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">
                  {formatCents(c.amount, currency, locale)}
                </span>
                {" · "}
                {percent.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${percent}%`,
                  backgroundColor: c.color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
