"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the viewport is below the given breakpoint (Tailwind `sm` = 640px).
 * Returns `false` until mounted to avoid hydration mismatches in the static export.
 */
export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
