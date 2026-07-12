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
      className="size-9 rounded-xl"
    >
      {amountsHidden ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
    </Button>
  );
}
