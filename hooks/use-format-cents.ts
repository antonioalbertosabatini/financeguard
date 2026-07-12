"use client";

import { useCallback } from "react";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { useFormattingLocale } from "@/providers/i18n-provider";
import { formatCentsMasked } from "@/lib/utils/money";

export function useFormatCents() {
  const { amountsHidden } = useAmountVisibility();
  const locale = useFormattingLocale();

  return useCallback(
    (cents: number, currency = "EUR", _locale?: string) =>
      formatCentsMasked(cents, currency, locale, amountsHidden),
    [amountsHidden, locale]
  );
}
