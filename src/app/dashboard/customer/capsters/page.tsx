"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, RefreshCw, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/modal";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { SHOP_BOOKING_PATH, SHOP_SLUG } from "@/lib/brand";

interface Capster {
  id: string;
  name: string;
  ready: boolean;
  booking_count: number;
}

export default function CustomerCapstersPage() {
  const [capsters, setCapsters] = useState<Capster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    const capsterRes = await fetch(`/api/capsters?slug=${SHOP_SLUG}`);
    const data = await capsterRes.json().catch(() => ({}));

    if (!capsterRes.ok) {
      setError(data.error ?? "Gagal memuat capster");
      setLoading(false);
      return;
    }

    setCapsters(data.capsters ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        title="Capster Ready"
        description="Status diperbarui otomatis. Capster yang sedang melayani pelanggan lain ditandai agar Anda bisa memilih yang lebih cepat."
        actions={
          <Button type="button" variant="outline" onClick={load}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
            Segarkan
          </Button>
        }
      />

      <FormError message={error} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="mt-3 h-5 w-28" />
              <Skeleton className="mt-4 h-9 w-full" />
            </div>
          ))}
        </div>
      ) : capsters.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Belum ada capster"
          description="Barbershop belum menambahkan capster. Anda masih bisa booking tanpa memilih capster tertentu."
        />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capsters.map((capster) => (
            <StaggerItem key={capster.id}>
              <SpotlightCard className="flex h-full flex-col p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary">
                  {capster.name.charAt(0).toUpperCase()}
                </span>

                <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
                  {capster.name}
                </h2>

                <span
                  className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
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
                  {capster.ready ? "Ready sekarang" : "Sedang melayani"}
                </span>

                <p className="mt-2 text-sm text-muted-foreground">
                  {capster.booking_count} booking hari ini
                </p>

                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={`${SHOP_BOOKING_PATH}?capster=${capster.id}`}>
                    <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden />
                    Booking dengan {capster.name.split(" ")[0]}
                  </Link>
                </Button>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </PageTransition>
  );
}
