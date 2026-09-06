"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/motion";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";

export type StatTone = "primary" | "accent" | "warning" | "danger" | "neutral";

const toneStyles: Record<StatTone, { icon: string; ring: string }> = {
  primary: { icon: "bg-primary/10 text-primary", ring: "ring-primary/15" },
  accent: { icon: "bg-accent/10 text-accent", ring: "ring-accent/15" },
  warning: {
    icon: "bg-[var(--status-waiting-bg)] text-[var(--status-waiting)]",
    ring: "ring-[var(--status-waiting)]/15",
  },
  danger: { icon: "bg-destructive/10 text-destructive", ring: "ring-destructive/15" },
  neutral: { icon: "bg-muted text-muted-foreground", ring: "ring-border" },
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: string;
  format?: (n: number) => string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  format,
  className,
}: StatCardProps) {
  const styles = toneStyles[tone];

  return (
    <SpotlightCard className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
            {typeof value === "number" ? (
              <AnimatedNumber value={value} format={format} />
            ) : (
              value
            )}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
            styles.icon,
            styles.ring
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </SpotlightCard>
  );
}
