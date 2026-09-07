"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldUser, X } from "lucide-react";
import { DemoAccountButtons } from "@/components/DemoAccountButtons";
import { BRAND_NAME } from "@/lib/brand";
import { transitionSoft } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Tombol mengambang + panel akun demo — muncul di semua halaman. */
export default function DemoLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[100] sm:bottom-6 sm:left-6">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-launcher-title"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={transitionSoft}
            className="pointer-events-auto mb-3 w-[min(100vw-2.5rem,24rem)] overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft-lg)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ShieldUser className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2
                    id="demo-launcher-title"
                    className="font-heading text-sm font-semibold text-foreground"
                  >
                    Akun demo {BRAND_NAME}
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Role · email · password. Klik Gunakan untuk isi form login.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup akun demo"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[min(62vh,34rem)] overflow-y-auto p-3">
              <DemoAccountButtons onUsed={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="demo-launcher-title"
        aria-label={open ? "Tutup akun uji coba" : "Buka akun uji coba"}
        className={cn(
          "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft-md)] transition duration-200 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open && "ring-2 ring-ring ring-offset-2"
        )}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <ShieldUser className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}

export {
  DEMO_CREDENTIALS_KEY,
  DEMO_FILL_EVENT,
  type DemoCredentials,
} from "@/lib/demo-credentials-events";
