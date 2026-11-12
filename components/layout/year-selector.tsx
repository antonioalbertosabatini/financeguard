"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/providers/i18n-provider";
import { useYear } from "@/providers/year-provider";

export function YearSelector() {
  const { t } = useI18n();
  const { year, setYear, availableYears } = useYear();

  return (
    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
      <SelectTrigger
        aria-label={t("common.year")}
        className="h-9! w-auto gap-1 rounded-full bg-card pr-2.5 pl-3.5 font-semibold tabular-nums md:h-10!"
      >
        <SelectValue placeholder={t("common.yearPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {availableYears.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
