"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the viewport is below the given breakpoint. Defaults to
 * Tailwind `md` (768px), the same cut-off the CSS layout uses to switch
 * between the mobile shell (bottom nav) and the desktop shell (sidebar).
 * Returns `false` until mounted to avoid hydration mismatches in the static export.
 */
export function useIsMobile(breakpoint = 768) {
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
