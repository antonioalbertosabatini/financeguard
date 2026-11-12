"use client";

import { useCallback } from "react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { useFormatCents } from "@/hooks/use-format-cents";
import { useAmountVisibility } from "@/providers/amount-visibility-provider";
import { cn } from "@/lib/utils";

type AmountKind = "income" | "expense" | "transfer";

interface AmountProps {
  /** Value in cents. For `kind` income/expense pass the absolute amount. */
  cents: number;
  currency?: string;
  /**
   * Adds the sign and the semantic colour: income → "+" success,
   * expense → "−" foreground, transfer → no sign, muted.
   */
  kind?: AmountKind;
  /** Colour the value by its own sign (positive success, negative danger). */
  toneBySign?: boolean;
  /** Tween from the previous value when it changes. */
  animated?: boolean;
  className?: string;
}

const MINUS = "−";

/**
 * The single way to render money in the UI: tabular numbers, masking
 * (eye toggle), sign and colour conventions, optional count-up animation.
 */
export function Amount({
  cents,
  currency = "EUR",
  kind,
  toneBySign = false,
  animated = false,
  className,
}: AmountProps) {
  const formatCents = useFormatCents();
  const { amountsHidden } = useAmountVisibility();

  const format = useCallback(
    (value: number) => {
      const text = formatCents(Math.abs(value), currency);
      if (kind === "income") return `+${text}`;
      if (kind === "expense") return `${MINUS}${text}`;
      if (value < 0 && !amountsHidden) return `${MINUS}${text}`;
      return text;
    },
    [formatCents, currency, kind, amountsHidden]
  );

  const tone =
    kind === "income"
      ? "text-success"
      : kind === "transfer"
        ? "text-muted-foreground"
        : toneBySign
          ? cents > 0
            ? "text-success"
            : cents < 0
              ? "text-danger"
              : undefined
          : undefined;

  const classes = cn("tabular-nums", tone, className);

  if (animated) {
    return (
      <AnimatedNumber
        // Remount when masking toggles so the masked text is not tweened.
        key={amountsHidden ? "hidden" : "visible"}
        value={cents}
        format={format}
        animated={!amountsHidden}
        className={classes}
      />
    );
  }
  return <span className={classes}>{format(cents)}</span>;
}
