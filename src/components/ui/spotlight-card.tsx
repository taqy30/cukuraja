"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.ComponentProps<"div"> {
  /** Matikan sorotan untuk kartu yang tidak interaktif. */
  interactive?: boolean;
}

/**
 * Kartu Soft UI dengan sorotan halus mengikuti kursor.
 * Sorotan memakai radial-gradient tipis pada layer terpisah sehingga tidak
 * menggeser layout dan tetap terbaca di light maupun dark mode.
 */
export function SpotlightCard({
  className,
  children,
  interactive = true,
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(null)}
      className={cn(
        "relative overflow-hidden surface-card",
        interactive && "surface-card-hover",
        className
      )}
      {...props}
    >
      {interactive && pos && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(340px circle at ${pos.x}px ${pos.y}px, color-mix(in oklab, var(--primary) 10%, transparent), transparent 65%)`,
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
