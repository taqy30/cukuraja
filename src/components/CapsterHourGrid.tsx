"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HourSlot {
  time: string;
  status: "available" | "booked" | "blocked" | "past";
  available: boolean;
  booking_code?: string | null;
  customer_name?: string | null;
  reason?: string | null;
}

interface Props {
  capsterId: string;
  date: string;
  /** Jika true, slot kosong bisa ditutup/dibuka (berhalangan). */
  canManage?: boolean;
  className?: string;
  onChanged?: () => void;
}

/**
 * Grid jam penuh 10:00, 11:00, … untuk satu capster.
 * Klik slot kosong → tandai berhalangan; klik blocked → buka lagi.
 */
export default function CapsterHourGrid({
  capsterId,
  date,
  canManage = false,
  className,
  onChanged,
}: Props) {
  const [slots, setSlots] = useState<HourSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTime, setBusyTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/capster-blocks?capster_id=${capsterId}&date=${date}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal memuat slot");
      setLoading(false);
      return;
    }
    setSlots(data.slots ?? []);
    setLoading(false);
  }, [capsterId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBlock = async (slot: HourSlot) => {
    if (!canManage) return;
    if (slot.status === "booked" || slot.status === "past") return;

    setBusyTime(slot.time);
    setError(null);

    if (slot.status === "blocked") {
      const params = new URLSearchParams({
        capster_id: capsterId,
        block_date: date,
        block_time: slot.time,
      });
      const res = await fetch(`/api/capster-blocks?${params}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal membuka slot");
      }
    } else {
      const res = await fetch("/api/capster-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capster_id: capsterId,
          block_date: date,
          block_time: slot.time,
          reason: "Berhalangan",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menutup slot");
      }
    }

    setBusyTime(null);
    await load();
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {slots.map((slot) => {
          const busy = busyTime === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={
                busy ||
                !canManage ||
                slot.status === "booked" ||
                slot.status === "past"
              }
              onClick={() => toggleBlock(slot)}
              title={
                slot.status === "booked"
                  ? `${slot.customer_name ?? "Booking"} (${slot.booking_code})`
                  : slot.status === "blocked"
                    ? slot.reason || "Berhalangan — klik untuk buka"
                    : canManage
                      ? "Klik untuk tandai berhalangan"
                      : "Tersedia"
              }
              className={cn(
                "rounded-xl border px-2 py-3 text-center transition",
                slot.status === "available" &&
                  "border-accent/30 bg-accent/5 text-foreground hover:border-accent/50",
                slot.status === "booked" &&
                  "cursor-default border-primary/25 bg-primary/10 text-primary",
                slot.status === "blocked" &&
                  "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                slot.status === "past" &&
                  "cursor-default border-border/50 bg-muted/40 text-muted-foreground/50",
                canManage &&
                  (slot.status === "available" || slot.status === "blocked") &&
                  "hover:brightness-95"
              )}
            >
              <div className="font-mono text-sm font-semibold">{slot.time}</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
                {busy
                  ? "…"
                  : slot.status === "available"
                    ? "Kosong"
                    : slot.status === "booked"
                      ? "Terisi"
                      : slot.status === "blocked"
                        ? "Tutup"
                        : "Lewat"}
              </div>
            </button>
          );
        })}
      </div>

      {canManage && (
        <p className="mt-3 text-xs text-muted-foreground">
          Slot kosong bisa ditutup jika berhalangan. Slot terisi hanya bisa diubah lewat antrean
          booking.
        </p>
      )}
    </div>
  );
}
