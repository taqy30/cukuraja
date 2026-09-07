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
    void import("@/components/DemoLauncher").then((mod) => {
      if (!cancelled) setLauncher(() => mod.default);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !Launcher) return null;
  return <Launcher />;
}
