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
      <SelectTrigger className="w-[92px] rounded-xl bg-card shadow-sm sm:w-[120px]">
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
