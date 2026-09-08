"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Globe,
  RefreshCw,
  SkipForward,
  Store,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonStats } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/modal";
import { RoleBadge } from "@/components/ui/role-badge";
import { PageTransition, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { RequirePermission } from "@/components/RequirePermission";
import { ROLE_DESCRIPTION, type AppRole } from "@/lib/auth/roles";

interface Overview {
  role: AppRole;
  date: string;
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  skipped: number;
  online: number;
  walk_in: number;
  unique_customers: number;
  no_show_rate: number;
  revenue?: number;
  popular_services: { name: string; count: number }[];
  hourly_distribution: { hour: number; count: number }[];
}

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/overview?date=${date}`);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "Gagal memuat ringkasan");
      setLoading(false);
      return;
    }

    setData(json);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const maxHour = Math.max(1, ...(data?.hourly_distribution ?? []).map((h) => h.count));

  return (
    <RequirePermission permission="overview.view" roles={["owner", "admin"]}>
    <PageTransition className="space-y-6">
      <PageHeader
        title="Ringkasan Operasional"
        description="Angka hari ini di seluruh kanal booking, dari walk-in sampai booking online."
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

      {data && (
        <Reveal>
          <SpotlightCard className="flex flex-wrap items-center gap-3 p-4" interactive={false}>
            <RoleBadge role={data.role} />
            <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTION[data.role]}</p>
          </SpotlightCard>
        </Reveal>
      )}

      {loading || !data ? (
        <SkeletonStats count={4} />
      ) : (
        <>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.revenue != null && (
              <StaggerItem>
                <StatCard
                  label="Omset selesai"
                  value={data.revenue}
                  icon={Wallet}
                  tone="accent"
                  format={rupiah}
                  hint="Dari booking berstatus selesai"
                />
              </StaggerItem>
            )}
            <StaggerItem>
              <StatCard
                label="Total booking"
                value={data.total}
                icon={CalendarDays}
                tone="primary"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Sedang berjalan"
                value={data.active}
                icon={Activity}
                tone="warning"
                hint="Belum selesai dilayani"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Selesai"
                value={data.completed}
                icon={CheckCircle2}
                tone="accent"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Pelanggan unik"
                value={data.unique_customers}
                icon={Users}
                tone="neutral"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Booking online"
                value={data.online}
                icon={Globe}
                tone="primary"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Walk-in (offline)"
                value={data.walk_in}
                icon={Store}
                tone="accent"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Dilewati"
                value={data.skipped}
                icon={SkipForward}
                tone="warning"
                hint={`No-show ${data.no_show_rate}%`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Dibatalkan"
                value={data.cancelled}
                icon={XCircle}
                tone="danger"
              />
            </StaggerItem>
          </Stagger>

          <div className="grid gap-4 lg:grid-cols-2">
            <Reveal>
              <SpotlightCard className="p-5" interactive={false}>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Layanan terlaris
                </h2>
                {data.popular_services.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Belum ada layanan yang dipesan pada tanggal ini.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {data.popular_services.map((service) => {
                      const max = data.popular_services[0].count || 1;
                      return (
                        <li key={service.name}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate text-foreground">{service.name}</span>
                            <span className="ml-3 shrink-0 font-mono text-muted-foreground">
                              {service.count}x
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500"
                              style={{ width: `${(service.count / max) * 100}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SpotlightCard>
            </Reveal>

            <Reveal delay={0.06}>
              <SpotlightCard className="p-5" interactive={false}>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Distribusi per jam
                </h2>
                {data.hourly_distribution.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Belum ada data jam sibuk.
                  </p>
                ) : (
                  <div className="mt-6 -mx-1 overflow-x-auto px-1 scrollbar-slim">
                    <div className="flex h-40 min-w-[280px] items-end gap-1.5 sm:min-w-0">
                      {data.hourly_distribution.map((slot) => (
                        <div
                          key={slot.hour}
                          className="flex min-w-0 flex-1 flex-col items-center gap-2"
                          title={`${slot.hour}:00 — ${slot.count} booking`}
                        >
                          <div
                            className="w-full rounded-t-md bg-primary/80 transition-[height] duration-500"
                            style={{
                              height: `${(slot.count / maxHour) * 100}%`,
                              minHeight: 4,
                            }}
                          />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {String(slot.hour).padStart(2, "0")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SpotlightCard>
            </Reveal>
          </div>

          {data.total === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Belum ada aktivitas"
              description="Tidak ada booking pada tanggal ini. Coba pilih tanggal lain atau tambahkan walk-in dari halaman Booking & Antrean."
            />
          )}
        </>
      )}
    </PageTransition>
    </RequirePermission>
  );
}
