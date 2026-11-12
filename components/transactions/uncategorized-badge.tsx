"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { Transaction } from "@/lib/schemas/transaction";

/** Entrata/uscita ancora senza categoria (tipicamente importata da file). */
export function isUncategorized(tx: Pick<Transaction, "type" | "categoryId">) {
  return tx.type !== "transfer" && !tx.categoryId;
}

export function UncategorizedBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-400",
        className
      )}
    >
      {t("transactions.uncategorizedBadge")}
    </Badge>
  );
}
