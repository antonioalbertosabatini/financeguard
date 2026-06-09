"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useYear } from "@/hooks/use-year";

export function YearSelector() {
  const { year, setYear, availableYears } = useYear();

  return (
    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
      <SelectTrigger className="h-9 w-[130px] rounded-xl bg-card shadow-sm">
        <SelectValue placeholder="Anno" />
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
