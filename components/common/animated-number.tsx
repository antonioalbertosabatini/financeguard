"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { transitions } from "@/lib/motion";

interface AnimatedNumberProps {
  /** Target value (e.g. cents). */
  value: number;
  /** Formats intermediate and final values (e.g. formatCents). */
  format: (value: number) => string;
  /** Disable the tween (e.g. when amounts are masked). */
  animated?: boolean;
  className?: string;
}

/**
 * Renders a number that tweens from its previous value to the new one.
 * Updates the DOM text directly to avoid a React render per frame.
 */
export function AnimatedNumber({
  value,
  format,
  animated = true,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduceMotion = useReducedMotion();
  // Rendered once; afterwards the effect owns the text so React never
  // fights the tween over the same text node.
  const [initialText] = useState(() => format(value));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current;
    previous.current = value;
    if (!animated || reduceMotion || from === value) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      ...transitions.number,
      onUpdate: (latest) => {
        node.textContent = format(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, format, animated, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {initialText}
    </span>
  );
}
