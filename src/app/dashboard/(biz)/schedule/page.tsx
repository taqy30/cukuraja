"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import BookingQueue, { type QueueBooking } from "@/components/BookingQueue";
import CapsterHourGrid from "@/components/CapsterHourGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { StatCard } from "@/components/ui/stat-card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { SkeletonList, SkeletonStats } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/modal";
import { PageTransition, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { RequirePermission } from "@/components/RequirePermission";

interface Overview {
  total: number;
  active: number;
  completed: number;
  lifetime_customers?: number;
  lifetime_completed?: number;
}

const ACTIVE = ["booked", "checked_in", "waiting", "called", "serving"];
const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Dashboard capster: jadwal per jam + antrean miliknya. */
export default function SchedulePage() {
  const [bookings, setBookings] = useState<QueueBooking[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    const [bookingRes, overviewRes, meRes] = await Promise.all([
      fetch(`/api/bookings?date=${date}`),
      fetch(`/api/overview?date=${date}`),
      fetch("/api/me"),
    ]);

    const bookingData = await bookingRes.json().catch(() => ({}));
    if (!bookingRes.ok) {
      setError(bookingData.error ?? "Gagal memuat jadwal");
      setLoading(false);
      return;
    }
    setBookings(bookingData.bookings ?? []);
    if (bookingData.staffId) setStaffId(bookingData.staffId);

    if (overviewRes.ok) {
      setOverview(await overviewRes.json());
    }

    if (meRes.ok) {
      const me = await meRes.json();
      if (me.staffId) setStaffId(me.staffId);
    }

    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
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

  const counts = useMemo(
    () => ({
      all: bookings.length,
      active: bookings.filter((b) => ACTIVE.includes(b.status)).length,
      completed: bookings.filter((b) => b.status === "completed").length,
    }),
    [bookings]
  );

  const filtered = useMemo(() => {
    if (filter === "active") return bookings.filter((b) => ACTIVE.includes(b.status));
    if (filter === "completed") return bookings.filter((b) => b.status === "completed");
    return bookings;
  }, [bookings, filter]);

  return (
    <RequirePermission permission="booking.read.own" roles={["capster"]}>
      <PageTransition className="space-y-6">
        <PageHeader
          title="Jadwal Saya"
          description="Slot per jam. Tandai berhalangan jika tidak bisa melayani — kasir tidak bisa walk-in di jam itu."
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
            </>
          }
        />

        <FormError message={error} />

        {loading ? (
          <SkeletonStats count={4} />
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StaggerItem>
              <StatCard
                label="Jadwal hari ini"
                value={overview?.total ?? counts.all}
                icon={ClipboardList}
                tone="primary"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Masih aktif"
                value={overview?.active ?? counts.active}
                icon={CalendarDays}
                tone="warning"
                hint="Belum selesai dilayani"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Selesai hari ini"
                value={overview?.completed ?? counts.completed}
                icon={CheckCircle2}
                tone="accent"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Total pelanggan saya"
                value={overview?.lifetime_customers ?? 0}
                icon={UsersRound}
                tone="neutral"
                hint={`${overview?.lifetime_completed ?? 0} kali selesai dilayani`}
              />
            </StaggerItem>
          </Stagger>
        )}

        {staffId && (
          <SpotlightCard className="p-5" interactive={false}>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Slot jam ({date})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hijau = kosong · Biru = ada booking · Kuning = berhalangan (klik untuk ubah)
            </p>
            <div className="mt-4">
              <CapsterHourGrid
                capsterId={staffId}
                date={date}
                canManage
                onChanged={load}
              />
            </div>
          </SpotlightCard>
        )}

        <Segmented
          layoutId="schedule-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: "Aktif", count: counts.active },
            { value: "completed", label: "Selesai", count: counts.completed },
            { value: "all", label: "Semua", count: counts.all },
          ]}
        />

        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <Reveal>
            <BookingQueue
              bookings={filtered}
              updating={updating}
              onStatusChange={changeStatus}
              showCapster={false}
              emptyTitle="Belum ada yang booking Anda"
              emptyDescription="Pelanggan harus memilih nama Anda saat booking agar jadwalnya muncul di sini."
            />
          </Reveal>
        )}
      </PageTransition>
    </RequirePermission>
  );
}
