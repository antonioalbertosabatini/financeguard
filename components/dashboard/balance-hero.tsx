"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Amount } from "@/components/common/amount";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

interface BalanceHeroProps {
  totalBalance: number;
  availableBalance: number;
  inAccumulation: number;
  inStocks: number;
  accountsCount: number;
  monthNet: number;
  /** Net flow per month (Jan..Dec) used for the decorative sparkline. */
  monthlyNet: number[];
  currentMonth: number;
  currency: string;
  className?: string;
}

/** Cumulative-net sparkline path, normalised to the given box. */
function sparklinePath(values: number[], width: number, height: number): string | null {
  if (values.length < 2) return null;
  let acc = 0;
  const points = values.map((v) => (acc += v));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  return points
    .map((p, i) => {
      const x = i * step;
      const y = height - 4 - ((p - min) / range) * (height - 8);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function BalanceHero({
  totalBalance,
  availableBalance,
  inAccumulation,
  inStocks,
  accountsCount,
  monthNet,
  monthlyNet,
  currentMonth,
  currency,
  className,
}: BalanceHeroProps) {
  const { t } = useI18n();
  const path = useMemo(
    () => sparklinePath(monthlyNet.slice(0, currentMonth), 240, 80),
    [monthlyNet, currentMonth]
  );
  const positive = monthNet >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <section
      aria-label={t("dashboard.totalBalance")}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-hero p-5 text-hero-foreground shadow-pop sm:p-7",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium opacity-80">
            {t("dashboard.totalBalance")} ·{" "}
            {accountsCount === 1
              ? t("dashboard.accountsCountOne")
              : t("dashboard.accountsCount", { count: accountsCount })}
          </p>
          <p className="mt-1.5 text-[2.25rem] leading-tight font-bold tracking-[-0.035em] sm:text-[2.75rem]">
            <Amount cents={totalBalance} currency={currency} animated />
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
            <TrendIcon className="size-3.5" aria-hidden="true" />
            <Amount
              cents={Math.abs(monthNet)}
              currency={currency}
              kind={positive ? "income" : "expense"}
              className="text-inherit"
            />
            <span className="opacity-90">{t("dashboard.thisMonth")}</span>
          </span>
        </div>
        {path && (
          <svg
            viewBox="0 0 240 80"
            className="mt-2 hidden h-20 w-60 shrink-0 opacity-90 sm:block"
            fill="none"
            aria-hidden="true"
          >
            <path d={`${path} L240 80 L0 80 Z`} fill="currentColor" opacity="0.1" />
            <path
              d={path}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4 text-sm">
        <div className="min-w-0">
          <dt className="truncate opacity-75">{t("dashboard.availableBalance")}</dt>
          <dd className="mt-0.5 truncate font-semibold">
            <Amount cents={availableBalance} currency={currency} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate opacity-75">{t("dashboard.inAccumulation")}</dt>
          <dd className="mt-0.5 truncate font-semibold">
            <Amount cents={inAccumulation} currency={currency} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate opacity-75">{t("dashboard.inStocks")}</dt>
          <dd className="mt-0.5 truncate font-semibold">
            <Amount cents={inStocks} currency={currency} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
