"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Scissors,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Reveal } from "@/components/motion";

interface BookingData {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
  note: string | null;
  source: string;
  service: {
    name: string;
    duration_minutes: number;
    price_start: number | null;
  } | null;
  business: {
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
  } | null;
  capster?: { id: string; name: string } | null;
}

const ACTIVE = new Set(["booked", "checked_in", "waiting", "called", "serving"]);

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function TicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchBooking = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/booking/by-code/${code}`);
      if (!res.ok) {
        setError("Booking tidak ditemukan");
        return;
      }
      const data = await res.json();
      setBooking(data.booking);
      setQueuePosition(data.queue_position ?? 0);
      setError("");
    } catch {
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(() => fetchBooking(), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grid-soft">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grid-soft px-4">
        <Reveal className="max-w-md text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Booking tidak ditemukan
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pastikan kode booking yang kamu masukkan sudah benar.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/customer/bookings">Ke riwayat booking</Link>
          </Button>
        </Reveal>
      </div>
    );
  }

  const isActive = ACTIVE.has(booking.status);

  return (
    <div className="min-h-screen bg-grid-soft px-4 py-10">
      <Reveal className="mx-auto max-w-lg">
        <SpotlightCard className="overflow-hidden p-0" interactive={false}>
          <div className="bg-primary px-6 py-8 text-center text-primary-foreground">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm text-primary-foreground/80">
              <Scissors className="h-4 w-4" aria-hidden />
              <span>{booking.business?.name ?? "Cukuraja"}</span>
            </div>
            <div className="font-heading text-4xl font-bold tracking-wider">
              {booking.booking_code}
            </div>
            <div className="mt-4 flex justify-center">
              <StatusBadge status={booking.status} />
            </div>
          </div>

          {isActive && queuePosition > 0 && (
            <div className="border-b border-border bg-primary/5 px-6 py-4 text-center">
              <div className="text-sm font-medium text-primary">Posisi antrean</div>
              <div className="font-heading text-3xl font-bold text-foreground">
                #{queuePosition}
              </div>
            </div>
          )}

          <div className="space-y-4 p-6">
            <DetailRow icon={User} label="Nama" value={booking.customer_name} />

            {booking.capster?.name && (
              <DetailRow icon={User} label="Capster" value={booking.capster.name} />
            )}

            {booking.service && (
              <DetailRow
                icon={Scissors}
                label="Layanan"
                value={
                  <>
                    {booking.service.name}
                    {booking.service.price_start != null && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {formatCurrency(booking.service.price_start)}
                      </span>
                    )}
                    <div className="text-xs font-normal text-muted-foreground">
                      {booking.service.duration_minutes} menit
                    </div>
                  </>
                }
              />
            )}

            <DetailRow
              icon={Calendar}
              label="Tanggal"
              value={formatDate(booking.booking_date)}
            />
            <DetailRow
              icon={Clock}
              label="Jam"
              value={formatTime(booking.booking_time)}
            />

            {booking.business?.address && (
              <DetailRow
                icon={MapPin}
                label="Lokasi"
                value={booking.business.address}
              />
            )}

            {booking.note && (
              <div className="border-t border-border pt-4">
                <div className="mb-1 text-sm text-muted-foreground">Catatan</div>
                <div className="text-sm text-foreground">{booking.note}</div>
              </div>
            )}
          </div>

          {isActive && (
            <div className="border-t border-border p-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={refreshing}
                onClick={() => fetchBooking(true)}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {refreshing ? "Memperbarui..." : "Refresh status"}
              </Button>
            </div>
          )}
        </SpotlightCard>

        {booking.business && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href={`/${booking.business.slug}`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              ← Kembali ke {booking.business.name}
            </Link>
          </p>
        )}
      </Reveal>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
