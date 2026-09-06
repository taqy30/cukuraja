"use client";

import { Toaster } from "sonner";

/** Toast global Soft UI (menggantikan alert browser). */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-soft-lg)]",
          title: "font-medium",
          description: "text-muted-foreground",
          closeButton: "border-border bg-card",
        },
      }}
    />
  );
}
