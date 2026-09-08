"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError } from "@/components/ui/modal";
import { PageTransition, Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";
import { localDateString } from "@/lib/datetime";
import { SHOP_BOOKING_PATH, SHOP_SLUG } from "@/lib/brand";

interface Slot {
  time: string;
  available: boolean;
  current_bookings: number;
  max_capacity: number;
}

interface Capster {
  id: string;
  name: string;
}

/** 7 hari ke depan mulai hari ini (tanggal lokal). */
function upcomingDays() {
  const days: { value: string; day: string; date: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      value: localDateString(d),
      day: d.toLocaleDateString("id-ID", { weekday: "short" }),
      date: String(d.getDate()),
    });
  }
  return days;
}

export default function CustomerSchedulePage() {
  const days = upcomingDays();
  const [businessId, setBusinessId] = useState("");
  const [capsters, setCapsters] = useState<Capster[]>([]);
  const [capsterId, setCapsterId] = useState("");
  const [date, setDate] = useState(days[0].value);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business/${SHOP_SLUG}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setError("Gagal memuat data Cukuraja");
          setLoading(false);
          return;
        }
        setBusinessId(data.business?.id ?? "");
        setCapsters(data.capsters ?? []);
        setCapsterId(data.capsters?.[0]?.id ?? "");
      })
      .catch(() => {
        setError("Gagal memuat data Cukuraja");
        setLoading(false);
      });
  }, []);

  const loadSlots = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ business_id: businessId, date });
    if (capsterId) params.set("capster_id", capsterId);

    const res = await fetch(`/api/slots?${params}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Gagal memuat jadwal");
      setSlots([]);
      setLoading(false);
      return;
    }

    setSlots(data.slots ?? []);
    setLoading(false);
  }, [businessId, date, capsterId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const availableCount = slots.filter((s) => s.available).length;

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        title="Cek Jadwal"
        description="Lihat slot yang masih kosong sebelum membuat booking, supaya tidak bolak-balik."
        actions={
          <Button asChild>
            <Link href={SHOP_BOOKING_PATH}>
              <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden />
              Booking sekarang
            </Link>
          </Button>
        }
      />

      <FormError message={error} />

      <Reveal>
        <SpotlightCard className="p-5" interactive={false}>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Pilih tanggal
          </Label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-slim">
            {days.map((day) => {
              const active = day.value === date;
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setDate(day.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-16 shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 transition-colors duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <span className="text-xs font-medium">{day.day}</span>
                  <span className="font-heading text-lg font-semibold">{day.date}</span>
                </button>
              );
            })}
          </div>

          {capsters.length > 0 && (
            <div className="mt-5 space-y-2">
              <Label htmlFor="cs-capster">Capster</Label>
              <select
                id="cs-capster"
                value={capsterId}
                onChange={(e) => setCapsterId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors duration-200 focus-visible:border-ring sm:w-72"
              >
                {capsters.map((capster) => (
                  <option key={capster.id} value={capster.id}>
                    {capster.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Slot dihitung per capster, jadi tiap capster punya ketersediaan sendiri.
              </p>
            </div>
          )}
        </SpotlightCard>
      </Reveal>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        </div>
      ) : slots.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Tidak ada slot"
          description="Barbershop mungkin tutup pada tanggal ini. Coba pilih tanggal lain."
        />
      ) : (
        <Reveal>
          <SpotlightCard className="p-5" interactive={false}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Slot tersedia
              </h2>
              <span className="text-sm text-muted-foreground">
                {availableCount} dari {slots.length} slot kosong
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {slots.map((slot) => (
                <div
                  key={slot.time}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center",
                    slot.available
                      ? "border-accent/30 bg-accent/10"
                      : "border-border bg-muted opacity-70"
                  )}
                >
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {slot.time}
                  </p>
                  <p
                    className="mt-0.5 text-xs font-medium"
                    style={{
                      color: slot.available ? "var(--accent)" : "var(--muted-foreground)",
                    }}
                  >
                    {slot.available ? "Tersedia" : "Penuh"}
                  </p>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </Reveal>
      )}
    </PageTransition>
  );
}
