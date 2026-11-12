"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Returns a function that keeps the selected `?year=` when building internal
 * links, so navigating between sections doesn't reset the year.
 */
export function useYearHref() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year");

  return useCallback(
    (href: string) => {
      if (!year) return href;
      const separator = href.includes("?") ? "&" : "?";
      return `${href}${separator}year=${encodeURIComponent(year)}`;
    },
    [year]
  );
}
