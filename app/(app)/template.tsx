"use client";

import { motion } from "motion/react";
import { EASE_FLUID } from "@/lib/motion";

/**
 * Re-mounted on every navigation (unlike layout.tsx): gives each page a short,
 * subtle entrance. Reduced motion is handled by MotionProvider.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_FLUID }}
    >
      {children}
    </motion.div>
  );
}
