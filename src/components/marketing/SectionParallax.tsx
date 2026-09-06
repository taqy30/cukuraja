"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "light" | "raised" | "primary";

type Props = {
  id: string;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
};

const TONE: Record<Tone, string> = {
  light: "bg-background text-foreground",
  raised: "bg-surface-raised text-foreground",
  primary: "bg-primary text-primary-foreground",
};

/**
 * Section konten + parallax ringan.
 * Tanpa orb blur / garis gradient neon.
 */
export default function SectionParallax({
  id,
  tone = "light",
  className,
  children,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const yContent = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "relative scroll-mt-24 overflow-hidden border-t border-border",
        TONE[tone],
        className
      )}
    >
      <motion.div
        style={reduced ? undefined : { y: yContent }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </section>
  );
}
