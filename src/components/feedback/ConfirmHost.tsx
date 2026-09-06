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
   * Auto-tutup & resolve `true` setelah N ms (countdown di tombol).
   * Berguna untuk sukses login → redirect otomatis.
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
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

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
    setSecondsLeft(null);
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
    if (!pending?.autoCloseMs || pending.autoCloseMs <= 0) {
      setSecondsLeft(null);
      return;
    }

    const totalSec = Math.max(1, Math.ceil(pending.autoCloseMs / 1000));
    setSecondsLeft(totalSec);

    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const left = Math.max(0, Math.ceil((pending.autoCloseMs! - elapsed) / 1000));
      setSecondsLeft(left);
      if (elapsed >= pending.autoCloseMs!) {
        window.clearInterval(tick);
        close(true);
      }
    }, 200);

    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const confirmText = (() => {
    const base = pending?.confirmLabel ?? (pending?.alert ? "OK" : "Lanjutkan");
    if (secondsLeft != null && pending?.autoCloseMs) {
      return `${base} (${secondsLeft})`;
    }
    return base;
  })();

  return (
    <AnimatePresence>
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={transitionSoft}
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft-xl)]"
          >
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
                {pending.autoCloseMs && secondsLeft != null && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mengalihkan otomatis dalam {secondsLeft} detik…
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {!pending.alert && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => close(false)}
                >
                  {pending.cancelLabel ?? "Batal"}
                </Button>
              )}
              <Button
                type="button"
                variant={pending.danger ? "destructive" : "default"}
                onClick={() => close(true)}
                className={pending.alert ? "w-full sm:w-auto" : undefined}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
