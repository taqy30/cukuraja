"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, RefreshCw, UserPlus } from "lucide-react";
import BookingQueue, { type QueueBooking } from "@/components/BookingQueue";
import BookingFormModal from "@/components/BookingFormModal";
import WalkInModal from "@/components/WalkInModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { SkeletonList } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/modal";
import { PageTransition, Reveal } from "@/components/motion";
import { RequirePermission } from "@/components/RequirePermission";
import type { Permission } from "@/lib/auth/roles";
import { askConfirm } from "@/components/feedback/ConfirmHost";
import { notify } from "@/lib/notify";

interface Option {
  id: string;
  name: string;
  duration_minutes?: number;
}

const ACTIVE = ["booked", "checked_in", "waiting", "called", "serving"];

const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [capsters, setCapsters] = useState<Option[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QueueBooking | null>(null);

  const can = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions]
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/bookings?date=${date}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Gagal memuat booking");
      setLoading(false);
      return;
    }

    setBookings(data.bookings ?? []);
    setServices(data.services ?? []);
    setCapsters(data.capsters ?? []);
    setPermissions(data.permissions ?? []);
    setBusinessId(data.businessId ?? "");
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
    // Antrean berubah cepat; jeda polling saat tab tidak terlihat.
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void load();
    };
    const interval = setInterval(tick, 15000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    setUpdating(id);
    setError(null);

    const res = await fetch(`/api/booking/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal mengubah status");
    } else {
      await load();
    }
    setUpdating(null);
  };

  const remove = async (id: string) => {
    const ok = await askConfirm({
      title: "Hapus booking?",
      description: "Booking ini akan dihapus secara permanen dan tidak dapat dikembalikan.",
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;

    setUpdating(id);
    const res = await fetch(`/api/booking/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Gagal menghapus booking";
      setError(message);
      notify.error(message);
    } else {
      notify.success("Booking berhasil dihapus");
      await load();
    }
    setUpdating(null);
  };

  const counts = useMemo(
    () => ({
      all: bookings.length,
      active: bookings.filter((b) => ACTIVE.includes(b.status)).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      closed: bookings.filter((b) => ["cancelled", "skipped"].includes(b.status)).length,
    }),
    [bookings]
  );

  const filtered = useMemo(() => {
    if (filter === "active") return bookings.filter((b) => ACTIVE.includes(b.status));
    if (filter === "completed") return bookings.filter((b) => b.status === "completed");
    if (filter === "closed")
      return bookings.filter((b) => ["cancelled", "skipped"].includes(b.status));
    return bookings;
  }, [bookings, filter]);

  return (
    <RequirePermission permission="booking.read.all">
    <PageTransition className="space-y-6">
      <PageHeader
        title="Booking & Antrean"
        description="Jalankan antrean hari ini, tambahkan walk-in, dan pantau status setiap pelanggan."
        actions={
          <>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                type="date"
                aria-label="Pilih tanggal"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button type="button" variant="outline" onClick={load}>
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
              Segarkan
            </Button>
            {can("booking.create.walkin") && (
              <Button type="button" variant="secondary" onClick={() => setWalkInOpen(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
                Walk-in
              </Button>
            )}
            {can("booking.update") && (
              <Button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Booking baru
              </Button>
            )}
          </>
        }
      />

      <FormError message={error} />

      <Segmented
        layoutId="bookings-filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "active", label: "Aktif", count: counts.active },
          { value: "completed", label: "Selesai", count: counts.completed },
          { value: "closed", label: "Batal & lewat", count: counts.closed },
          { value: "all", label: "Semua", count: counts.all },
        ]}
      />

      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <Reveal>
          <BookingQueue
            bookings={filtered}
            updating={updating}
            onStatusChange={changeStatus}
            onEdit={
              can("booking.update")
                ? (booking) => {
                    setEditing(booking);
                    setFormOpen(true);
                  }
                : undefined
            }
            onDelete={can("booking.delete") ? remove : undefined}
            emptyTitle={
              filter === "active" ? "Antrean kosong" : "Tidak ada booking di filter ini"
            }
            emptyDescription={
              filter === "active"
                ? "Belum ada pelanggan aktif pada tanggal ini. Tambahkan walk-in jika ada yang datang langsung."
                : "Coba ganti filter atau pilih tanggal lain."
            }
          />
        </Reveal>
      )}

      {can("booking.create.walkin") && businessId && (
        <WalkInModal
          open={walkInOpen}
          onClose={() => setWalkInOpen(false)}
          onSaved={load}
          businessId={businessId}
          services={services}
          capsters={capsters}
        />
      )}

      {can("booking.update") && businessId && (
        <BookingFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={load}
          businessId={businessId}
          services={services}
          capsters={capsters}
          booking={editing}
        />
      )}
    </PageTransition>
    </RequirePermission>
  );
}
