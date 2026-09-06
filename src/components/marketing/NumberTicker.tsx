"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  className?: string;
  /** Prefiks opsional, mis. "0" → 01 */
  pad?: number;
};

/**
 * Number ticker ala 21st.dev — untuk nomor langkah editorial.
 * Tanpa glow; hormati reduced motion.
 */
export function NumberTicker({ value, className, pad = 2 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 22 });

  useEffect(() => {
    if (reduced) return;
    if (inView) motionValue.set(value);
  }, [inView, motionValue, reduced, value]);

  useEffect(() => {
    if (reduced) return;
    const unsub = spring.on("change", (latest) => {
      if (!ref.current) return;
      ref.current.textContent = String(Math.round(latest)).padStart(pad, "0");
    });
    return unsub;
  }, [pad, reduced, spring]);

  const fallback = String(value).padStart(pad, "0");

  if (reduced) {
    return (
      <span className={cn("tabular-nums", className)}>{fallback}</span>
    );
  }

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {fallback}
    </motion.span>
  );
}
