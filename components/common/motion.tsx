"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { riseVariants, staggerVariants } from "@/lib/motion";

/** A block that fades/slides in on mount. */
export function Rise({
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={riseVariants}
      transition={delay ? { delay } : undefined}
      {...props}
    />
  );
}

/** Container whose <StaggerItem> children enter one after another. */
export function Stagger({
  stagger = 0.05,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { stagger?: number; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerVariants(stagger, delay)}
      {...props}
    />
  );
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return <motion.div variants={riseVariants} {...props} />;
}
