"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transitionSoft } from "@/components/motion";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tombol konfirmasi berwarna bahaya (hapus/nonaktifkan). */
  danger?: boolean;
  /** Hanya satu tombol (info/sukses), tanpa Batal. */
  alert?: boolean;
  /**
   * Auto-tutup & resolve `true` setelah N ms.
   * Menampilkan garis progress yang mengecil (bukan countdown angka).
   */
  autoCloseMs?: number;
};

type Pending = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

let askConfirmImpl: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

/** Konfirmasi bergaya modal Framer Motion. Pengganti `window.confirm`. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  if (!askConfirmImpl) {
    console.warn("ConfirmHost belum terpasang; fallback ke confirm browser.");
    return Promise.resolve(
      typeof window !== "undefined"
        ? window.confirm([options.title, options.description].filter(Boolean).join("\n"))
        : false
    );
  }
  return askConfirmImpl(options);
}

/** Popup info/sukses dengan satu tombol. */
export function askAlert(
  options: Omit<ConfirmOptions, "alert" | "cancelLabel" | "danger">
) {
  return askConfirm({
    ...options,
    alert: true,
    confirmLabel: options.confirmLabel ?? "OK",
  });
}

export default function ConfirmHost() {
  const reduced = useReducedMotion();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    askConfirmImpl = (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      });

    return () => {
      askConfirmImpl = null;
    };
  }, []);

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending.autoCloseMs) close(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  useEffect(() => {
    if (!pending?.autoCloseMs || pending.autoCloseMs <= 0) return;

    const timer = window.setTimeout(() => {
      close(true);
    }, pending.autoCloseMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const showProgress = Boolean(pending?.autoCloseMs && pending.autoCloseMs > 0);
  const progressMs = pending?.autoCloseMs ?? 0;

  return (
    <AnimatePresence>
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitionSoft}
            className="absolute inset-0 bg-foreground/55 backdrop-blur-sm"
            onClick={() => {
              if (!pending.autoCloseMs) close(false);
            }}
            aria-hidden
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.description ? "confirm-desc" : undefined}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 16 }}
            transition={transitionSoft}
            className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-card shadow-[var(--shadow-soft-xl)] sm:rounded-2xl"
          >
            <div className="p-6">
              <div className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    pending.alert
                      ? "bg-accent/10 text-accent"
                      : pending.danger
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {pending.alert ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                  ) : (
                    <AlertTriangle className="h-5 w-5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <h2
                    id="confirm-title"
                    className="font-heading text-base font-semibold text-foreground"
                  >
                    {pending.title}
                  </h2>
                  {pending.description && (
                    <p
                      id="confirm-desc"
                      className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
                    >
                      {pending.description}
                    </p>
                  )}
                  {showProgress && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Mengalihkan otomatis…
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {!pending.alert && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => close(false)}
                  >
                    {pending.cancelLabel ?? "Batal"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant={pending.danger ? "destructive" : "default"}
                  onClick={() => close(true)}
                  className="w-full sm:w-auto"
                >
                  {pending.confirmLabel ?? (pending.alert ? "OK" : "Lanjutkan")}
                </Button>
              </div>
            </div>

            {showProgress && (
              <div
                className="h-1 w-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Mengalihkan otomatis"
              >
                <motion.div
                  className="h-full origin-left bg-primary"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: progressMs / 1000, ease: "linear" }
                  }
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
