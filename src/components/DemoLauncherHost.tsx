"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Client gate: load DemoLauncher hanya saat enabled.
 * Tidak memakai next/dynamic + ssr:false di Server Component (dilarang Next 16).
 */
export default function DemoLauncherHost({ enabled }: { enabled: boolean }) {
  const [Launcher, setLauncher] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLauncher(null);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId = 0;

    const load = () => {
      void import("@/components/DemoLauncher").then((mod) => {
        if (!cancelled) setLauncher(() => mod.default);
      });
    };

    // Jangan bersaing dengan LCP hero di first paint.
    idleId =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(load, { timeout: 3000 })
        : null;
    timeoutId = window.setTimeout(load, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [enabled]);

  if (!enabled || !Launcher) return null;
  return <Launcher />;
}
