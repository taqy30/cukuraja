"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Transition,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

/** Easing editorial: cepat, tidak “bouncy AI”. */
export const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export const transitionSoft: Transition = {
  duration: 0.28,
  ease: EASE_SOFT,
};

export const transitionQuick: Transition = {
  duration: 0.18,
  ease: EASE_SOFT,
};

type Direction = "up" | "down" | "left" | "right" | "none";

function offsetFor(direction: Direction, distance: number) {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
    default:
      return {};
  }
}

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  direction?: Direction;
  onScroll?: boolean;
}

/** Fade + slide — tanpa blur berlebih (hindari AI slop). */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 20,
  direction = "up",
  onScroll = false,
}: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  const hidden = { opacity: 0, ...offsetFor(direction, distance) };
  const shown = { opacity: 1, x: 0, y: 0 };

  return (
    <motion.div
      className={className}
      initial={hidden}
      {...(onScroll
        ? { whileInView: shown, viewport: { once: true, margin: "-12% 0px" } }
        : { animate: shown })}
      transition={{ duration: 0.55, ease: EASE_SOFT, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_SOFT },
  },
};

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  onScroll?: boolean;
}

export function Stagger({ children, className, onScroll = false }: StaggerProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      {...(onScroll
        ? { whileInView: "show", viewport: { once: true, margin: "-12% 0px" } }
        : { animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitionSoft}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({
  value,
  className,
  format,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const text = format ? format(value) : value.toLocaleString("id-ID");

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={text}
        className={cn("inline-block tabular-nums", className)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={transitionQuick}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * Pola ala 21st.dev Text Reveal — garis bawah tumbuh saat masuk viewport.
 * Tanpa glow / neon.
 */
export function RuleReveal({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={cn("h-px w-full bg-border", className)} aria-hidden />;
  }

  return (
    <motion.div
      aria-hidden
      className={cn("h-px origin-left bg-foreground/20", className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, ease: EASE_SOFT }}
    />
  );
}

export { AnimatePresence, motion, useReducedMotion, useScroll, useTransform };
