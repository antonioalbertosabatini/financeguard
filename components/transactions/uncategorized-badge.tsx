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
      variant="warning"
      className={cn(
        "h-5 shrink-0 px-2 text-[0.6875rem]",
        className
      )}
    >
      {t("transactions.uncategorizedBadge")}
    </Badge>
  );
}
