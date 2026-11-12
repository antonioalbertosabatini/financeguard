import type { Transition, Variants } from "motion/react";

/**
 * Motion presets shared by the whole app. Keep animations short and sober:
 * they should make state changes legible, never slow the user down.
 * Reduced motion is handled globally by <MotionProvider> (reducedMotion="user")
 * and by the CSS fallback in app/globals.css.
 */

/** Same curve as the CSS token `--ease-fluid`. */
export const EASE_FLUID = [0.2, 0.8, 0.2, 1] as const;

export const transitions = {
  /** Tap / press feedback. */
  press: { duration: 0.15, ease: EASE_FLUID },
  /** Overlays, fades. */
  fade: { duration: 0.25, ease: "easeOut" },
  /** Content entering the page. */
  rise: { duration: 0.5, ease: EASE_FLUID },
  /** Bottom sheets and drawers. */
  sheet: { type: "spring", damping: 34, stiffness: 340, mass: 0.9 },
  /** Shared-layout indicators (active tab pill, segmented controls). */
  indicator: { type: "spring", stiffness: 520, damping: 40 },
  /** Number tweens (balances, totals). */
  number: { duration: 0.8, ease: EASE_FLUID },
} satisfies Record<string, Transition>;

/** Fade + small upward slide. Use with initial="hidden" animate="show". */
export const riseVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: transitions.rise },
};

/** Parent that staggers `riseVariants` children (lists, card grids). */
export function staggerVariants(stagger = 0.05, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}
