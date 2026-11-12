"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useI18n } from "@/providers/i18n-provider";

export function AmountVisibilityToggle() {
  const { amountsHidden, toggleAmountsVisibility } = useAmountVisibility();
  const { t } = useI18n();

  const label = amountsHidden
    ? t("common.showAmounts")
    : t("common.hideAmounts");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleAmountsVisibility}
      aria-label={label}
      title={label}
      className="rounded-full text-muted-foreground hover:text-foreground"
    >
      {amountsHidden ? (
        <EyeOff className="size-[1.125rem]" />
      ) : (
        <Eye className="size-[1.125rem]" />
      )}
    </Button>
  );
}
