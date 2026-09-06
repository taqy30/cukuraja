"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: string;
  count?: number;
}

interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  /** Id unik agar indikator tidak bertabrakan saat ada dua segmented di satu halaman. */
  layoutId?: string;
  className?: string;
}

/** Filter tab dengan indikator yang bergeser halus (layout animation). */
export function Segmented({
  options,
  value,
  onChange,
  layoutId = "segmented-active",
  className,
}: SegmentedProps) {
  const reduced = useReducedMotion();

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1 scrollbar-slim sm:w-auto",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active &&
              (reduced ? (
                <span className="absolute inset-0 rounded-lg bg-primary" aria-hidden />
              ) : (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  aria-hidden
                />
              ))}
            <span className="relative flex items-center gap-1.5">
              {option.label}
              {option.count != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    active ? "bg-white/20" : "bg-border/70 text-muted-foreground"
                  )}
                >
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
