"use client";

import { Suspense } from "react";
import { YearProvider } from "@/providers/year-provider";

export function YearProviderWrapper({
  children,
  availableYears,
}: {
  children: React.ReactNode;
  availableYears: number[];
}) {
  return (
    <Suspense fallback={null}>
      <YearProvider availableYears={availableYears}>{children}</YearProvider>
    </Suspense>
  );
}
