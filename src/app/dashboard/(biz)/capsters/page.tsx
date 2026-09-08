"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw, UsersRound } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import CapsterHourGrid from "@/components/CapsterHourGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/modal";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface Capster {
  id: string;
  name: string;
  ready: boolean;
  booking_count: number;
  unique_customers: number;
  bookings?: { time: string; status: string; customer_name: string }[];
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function CapstersPage() {
  const { can } = usePermissions();
  const canBlock = can("schedule.block");
  const [capsters, setCapsters] = useState<Capster[]>([]);
  const [date, setDate] = useState(todayLocal);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/capsters?date=${date}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Gagal memuat data capster");
      setLoading(false);
      return;
    }

    setCapsters(data.capsters ?? []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        title="Capster"
        description={
          canBlock
            ? "Lihat slot per jam dan tutup jadwal jika capster berhalangan. Walk-in hanya bisa di jam kosong."
            : "Ketersediaan dan beban kerja tiap capster hari ini."
        }
        actions={
          <>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                type="date"
                aria-label="Pilih tanggal"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-w-0 flex-1 sm:w-auto sm:flex-none"
              />
            </div>
            <Button type="button" variant="outline" onClick={load} className="w-full sm:w-auto">
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
              Segarkan
            </Button>
          </>
        }
      />

      <FormError message={error} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="mt-3 h-5 w-32" />
              <Skeleton className="mt-4 h-16 w-full" />
            </div>
          ))}
        </div>
      ) : capsters.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Belum ada capster aktif"
          description="Tambahkan akun dengan role capster dari halaman Tim & Akun."
        />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capsters.map((capster) => (
            <StaggerItem key={capster.id}>
              <SpotlightCard className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-base font-semibold text-primary">
                    {capster.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{capster.name}</p>
                    <span
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: capster.ready
                          ? "var(--status-completed-bg)"
                          : "var(--status-serving-bg)",
                        color: capster.ready
                          ? "var(--status-completed)"
                          : "var(--status-serving)",
                      }}
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "currentColor" }}
                      />
                      {capster.ready ? "Ready" : "Sedang melayani"}
                    </span>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">Booking</dt>
                    <dd className="font-heading text-lg font-semibold text-foreground">
                      {capster.booking_count}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">Pelanggan</dt>
                    <dd className="font-heading text-lg font-semibold text-foreground">
                      {capster.unique_customers}
                    </dd>
                  </div>
                </dl>

                {capster.bookings && capster.bookings.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-border pt-4">
                    {capster.bookings.map((booking, i) => (
                      <li
                        key={`${booking.time}-${i}`}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {String(booking.time).slice(0, 5)}
                          </span>
                          <span className="truncate text-foreground">
                            {booking.customer_name}
                          </span>
                        </span>
                        <StatusBadge status={booking.status} />
                      </li>
                    ))}
                  </ul>
                )}

                {canBlock && (
                  <div className="mt-4 border-t border-border pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setExpanded((id) => (id === capster.id ? null : capster.id))
                      }
                    >
                      {expanded === capster.id ? "Sembunyikan slot jam" : "Kelola slot jam"}
                    </Button>
                    {expanded === capster.id && (
                      <div className="mt-3">
                        <CapsterHourGrid
                          capsterId={capster.id}
                          date={date}
                          canManage
                          onChanged={load}
                        />
                      </div>
                    )}
                  </div>
                )}
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
