"use client";

import { useMemo, useState } from "react";
import { Banknote, Settings2 } from "lucide-react";
import { AllocationSettingsDialog } from "@/components/allocation/allocation-settings-dialog";
import { ALLOCATION_BUCKETS } from "@/components/allocation/allocation-buckets";
import { PageHeader } from "@/components/layout/page-header";
import { FullScreenLoader } from "@/components/providers/full-screen-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getIncomeAllocation } from "@/lib/actions/income-allocation";
import { useFormatCents } from "@/hooks/use-format-cents";
import { getMonthLabelsFull } from "@/lib/i18n/translate";
import { useAsyncData } from "@/lib/storage/use-async-data";
import { currentMonth } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

export function AllocationView({ year }: { year: number }) {
  const { t, language } = useI18n();
  const formatAmount = useFormatCents();
  const [month, setMonth] = useState(String(currentMonth()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const monthNum = parseInt(month, 10);

  const { data } = useAsyncData(
    () => getIncomeAllocation(year, monthNum),
    [year, monthNum]
  );

  const monthLabelsFull = useMemo(
    () => getMonthLabelsFull(language),
    [language]
  );
  const monthLabel = monthLabelsFull[monthNum - 1];

  if (!data) return <FullScreenLoader />;

  const stale = data.year !== year || data.month !== monthNum;
  const { settings, incomeCategories, totalIncome, percents, amounts } = data;
  const currency = settings.defaultCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("allocation.title")}
        description={t("allocation.description", {
          month: monthLabel,
          year,
        })}
        actions={
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthLabelsFull.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("allocation.settingsAria")}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 />
            </Button>
          </div>
        }
      />

      {stale && (
        <p className="text-sm text-muted-foreground">
          {t("common.loadingEllipsis")}
        </p>
      )}

      <div className={cn("space-y-6", stale && "opacity-60")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("allocation.monthlyIncome")}
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-success/10 text-success">
              <Banknote className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold tracking-tight tabular-nums text-success sm:text-3xl">
              {formatAmount(totalIncome, currency)}
            </p>
            {totalIncome === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("allocation.emptyIncome")}
              </p>
            )}
          </CardContent>
        </Card>

        <div
          className="flex h-3 overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          {ALLOCATION_BUCKETS.map((bucket) => (
            <div
              key={bucket.id}
              className={bucket.barClassName}
              style={{ width: `${percents[bucket.id]}%` }}
              title={`${t(bucket.titleKey)} ${percents[bucket.id]}%`}
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ALLOCATION_BUCKETS.map((bucket) => {
            const Icon = bucket.icon;
            const percent = percents[bucket.id];
            return (
              <Card key={bucket.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${bucket.iconClassName}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="leading-snug">
                        {t(bucket.titleKey)}
                      </CardTitle>
                      <CardDescription>{t(bucket.hintKey)}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{percent}%</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {formatAmount(amounts[bucket.id], currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("allocation.percentOfIncome", { percent })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {settingsOpen && (
        <AllocationSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          incomeCategories={incomeCategories}
        />
      )}
    </div>
  );
}
