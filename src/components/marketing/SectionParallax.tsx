"use client";

import { useEffect, useRef, useState } from "react";
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
 * Section konten + parallax ringan (desktop saja, setelah mount).
 * Mobile / SSR: static — hemat main-thread.
 */
export default function SectionParallax({
  id,
  tone = "light",
  className,
  children,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [enableParallax, setEnableParallax] = useState(false);

  useEffect(() => {
    if (reduced) {
      setEnableParallax(false);
      return;
    }
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setEnableParallax(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [reduced]);

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
      {enableParallax ? (
        <motion.div style={{ y: yContent }} className="relative z-10">
          {children}
        </motion.div>
      ) : (
        <div className="relative z-10">{children}</div>
      )}
    </section>
  );
}
