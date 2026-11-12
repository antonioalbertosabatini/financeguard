/**
 * App-wide toast: sonner's `toast` plus native haptic feedback for
 * success / warning / error (no-op on web and desktop). Import from here
 * instead of "sonner".
 */
import { toast as sonner } from "sonner";
import { haptic } from "@/lib/native/haptics";

type Sonner = typeof sonner;

function withHaptic<F extends (...args: never[]) => unknown>(fn: F, kind: Parameters<typeof haptic>[0]): F {
  return ((...args: Parameters<F>) => {
    haptic(kind);
    return fn(...args);
  }) as F;
}

export const toast: Sonner = Object.assign(
  ((...args: Parameters<Sonner>) => sonner(...args)) as Sonner,
  sonner,
  {
    success: withHaptic(sonner.success, "success"),
    warning: withHaptic(sonner.warning, "warning"),
    error: withHaptic(sonner.error, "error"),
  }
);
