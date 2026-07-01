"use client";

import { useCallback } from "react";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { formatCentsMasked } from "@/lib/utils/money";

export function useFormatCents() {
  const { amountsHidden } = useAmountVisibility();

  return useCallback(
    (cents: number, currency = "EUR", locale = "it-IT") =>
      formatCentsMasked(cents, currency, locale, amountsHidden),
    [amountsHidden]
  );
}
