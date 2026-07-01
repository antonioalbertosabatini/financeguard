"use client";

import { Suspense, createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { currentYear } from "@/lib/utils/dates";

type YearContextValue = {
  year: number;
  setYear: (year: number) => void;
  availableYears: number[];
};

const YearContext = createContext<YearContextValue | null>(null);

export function YearProvider({
  children,
  availableYears,
}: {
  children: ReactNode;
  availableYears: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const year = useMemo(() => {
    const param = searchParams.get("year");
    if (param) {
      const parsed = parseInt(param, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return currentYear();
  }, [searchParams]);

  const setYear = useCallback(
    (newYear: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", String(newYear));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <Suspense fallback={null}>
      <YearContext.Provider value={{ year, setYear, availableYears }}>
        {children}
      </YearContext.Provider>
    </Suspense>
  );
}

export function useYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error("useYear must be used within YearProvider");
  return ctx;
}
