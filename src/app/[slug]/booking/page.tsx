"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Phone,
  Scissors,
  User,
  UserCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { FormError } from "@/components/ui/modal";
import { Reveal, transitionSoft } from "@/components/motion";
import { localDateString } from "@/lib/datetime";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_start: number | null;
}

interface Business {
  id: string;
  name: string;
  slug: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  current_bookings: number;
  max_capacity: number;
}

interface Capster {
  id: string;
  name: string;
  role: string;
}

const STEPS = ["Capster", "Layanan", "Tanggal", "Jam", "Konfirmasi"] as const;

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  return {
    day: dayNames[d.getDay()],
    date: d.getDate(),
    month: d.toLocaleDateString("id-ID", { month: "short" }),
  };
}

function formatTime12(time: string) {
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

const pickClass = (active: boolean, disabled = false) =>
  [
    "rounded-xl border text-center transition-all duration-200",
    disabled
      ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground/40"
      : active
        ? "border-primary bg-primary/5 ring-1 ring-primary"
        : "border-border hover:border-primary/40 hover:bg-muted/30",
  ].join(" ");

function BookingPageContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const preselectedCapster = searchParams.get("capster");
  const preselectedService = searchParams.get("service");

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [capsters, setCapsters] = useState<Capster[]>([]);
  const [selectedCapster, setSelectedCapster] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [success, setSuccess] = useState<{
    booking_code: string;
    capsterName?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requiresCapster = capsters.length > 0;
  const capsterDone = !requiresCapster || !!selectedCapster;
  const serviceDone = !!selectedService;
  const dateDone = !!selectedDate;
  const timeDone = !!selectedTime;

  const currentStep = !capsterDone
    ? 0
    : !serviceDone
      ? 1
      : !dateDone
        ? 2
        : !timeDone
          ? 3
          : 4;

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return localDateString(d);
  });

  const selectedCapsterName = capsters.find((c) => c.id === selectedCapster)?.name;
  const selectedServiceData = services.find((s) => s.id === selectedService);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata as {
        full_name?: string;
        phone?: string;
      };
      if (meta?.full_name) setCustomerName(meta.full_name);
      if (meta?.phone) setCustomerPhone(meta.phone);
    }
    loadProfile();
  }, []);

  useEffect(() => {
    async function fetchBusiness() {
      const res = await fetch(`/api/business/${slug}`);
      if (!res.ok) return;
      const data = await res.json();
      setBusiness(data.business);
      setServices(data.services ?? []);
      const list: Capster[] = data.capsters ?? [];
      setCapsters(list);
      if (preselectedCapster && list.some((c) => c.id === preselectedCapster)) {
        setSelectedCapster(preselectedCapster);
      } else if (list.length === 1) {
        setSelectedCapster(list[0].id);
      }
    }
    fetchBusiness();
  }, [slug, preselectedCapster]);

  useEffect(() => {
    if (
      capsterDone &&
      preselectedService &&
      services.some((s) => s.id === preselectedService)
    ) {
      setSelectedService(preselectedService);
    }
  }, [capsterDone, preselectedService, services]);

  const pickCapster = useCallback((id: string) => {
    setSelectedCapster(id);
    setSelectedService("");
    setSelectedDate("");
    setSelectedTime("");
    setSlots([]);
  }, []);

  const pickService = useCallback((id: string) => {
    setSelectedService(id);
    setSelectedDate("");
    setSelectedTime("");
    setSlots([]);
  }, []);

  const pickDate = useCallback((d: string) => {
    setSelectedDate(d);
    setSelectedTime("");
    setSlots([]);
  }, []);

  useEffect(() => {
    if (!business || !selectedDate || !selectedService) return;
    if (requiresCapster && !selectedCapster) return;

    async function fetchSlots() {
      setSlotsLoading(true);
      setSelectedTime("");
      const params = new URLSearchParams({
        business_id: business!.id,
        date: selectedDate,
        service_id: selectedService,
      });
      if (selectedCapster) params.set("capster_id", selectedCapster);

      const res = await fetch(`/api/slots?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots ?? []);
      }
      setSlotsLoading(false);
    }
    fetchSlots();
  }, [business, selectedDate, selectedService, selectedCapster, requiresCapster]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: business.id,
        service_id: selectedService,
        customer_name: customerName,
        customer_phone: customerPhone,
        booking_date: selectedDate,
        booking_time: selectedTime,
        assigned_capster_id: selectedCapster || undefined,
        note: note || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal membuat booking");
      setLoading(false);
      return;
    }

    const capsterName =
      (data.booking?.capster as { name: string } | null)?.name ??
      selectedCapsterName;
    setSuccess({ booking_code: data.booking.booking_code, capsterName });
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grid-soft px-4 py-12">
        <Reveal className="w-full max-w-md">
          <SpotlightCard className="p-8 text-center" interactive={false}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Booking berhasil!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Kode booking kamu:</p>
            <div className="mt-4 rounded-xl bg-primary/5 px-4 py-5">
              <div className="font-heading text-3xl font-bold tracking-wider text-primary">
                {success.booking_code}
              </div>
            </div>
            {success.capsterName && (
              <p className="mt-4 text-sm text-muted-foreground">
                Capster:{" "}
                <span className="font-semibold text-foreground">
                  {success.capsterName}
                </span>
              </p>
            )}
            <div className="mt-6 space-y-3">
              <Link
                href={`/ticket/${success.booking_code}`}
                className={buttonVariants({ size: "lg", className: "w-full" })}
              >
                Lihat tiket booking
              </Link>
              <Link
                href="/dashboard/customer/bookings"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                  className: "w-full",
                })}
              >
                Riwayat booking saya
              </Link>
              <Link
                href={`/${slug}`}
                className="block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Kembali ke {business?.name ?? "barbershop"}
              </Link>
            </div>
          </SpotlightCard>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid-soft">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link
            href={`/${slug}`}
            className="-ml-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading font-semibold text-foreground">
              Booking online
            </h1>
            <p className="text-sm text-muted-foreground">
              {business?.name || "Memuat..."}
            </p>
          </div>
        </div>
        <div className="mx-auto flex max-w-2xl gap-1 px-4 pb-3">
          {STEPS.map((label, i) => (
            <div
              key={label}
              title={label}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/80">
          Urutan: <strong>Capster</strong> → Layanan → Tanggal → Jam → konfirmasi.
          Riwayat tersimpan di akun pelanggan Anda.
        </div>

        <FormError message={error} />

        <AnimatePresence mode="popLayout">
          {requiresCapster && (
            <motion.div
              key="capster"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={transitionSoft}
            >
              <SpotlightCard className="p-6" interactive={false}>
                <div className="mb-1 flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="font-heading font-semibold text-foreground">
                    1. Pilih capster
                  </h2>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Jadwal mengikuti ketersediaan capster yang dipilih.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {capsters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCapster(c.id)}
                      className={`p-4 ${pickClass(selectedCapster === c.id)}`}
                    >
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        {c.name.charAt(0)}
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        {c.name}
                      </div>
                    </button>
                  ))}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {capsterDone && (
            <motion.div
              key="service"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={transitionSoft}
            >
              <SpotlightCard className="p-6" interactive={false}>
                <div className="mb-4 flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="font-heading font-semibold text-foreground">
                    {requiresCapster ? "2. Pilih layanan" : "1. Pilih layanan"}
                  </h2>
                </div>
                {selectedCapsterName && (
                  <p className="mb-3 text-xs text-primary">
                    Capster: {selectedCapsterName}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => pickService(service.id)}
                      className={`p-4 text-left ${pickClass(
                        selectedService === service.id
                      )}`}
                    >
                      <div className="text-sm font-medium text-foreground">
                        {service.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{service.duration_minutes} menit</span>
                        {service.price_start != null && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(service.price_start)}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {capsterDone && serviceDone && (
            <motion.div
              key="date"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={transitionSoft}
            >
              <SpotlightCard className="p-6" interactive={false}>
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="font-heading font-semibold text-foreground">
                    {requiresCapster ? "3. Pilih tanggal" : "2. Pilih tanggal"}
                  </h2>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dates.map((d) => {
                    const formatted = formatDate(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => pickDate(d)}
                        className={`w-16 flex-shrink-0 py-3 ${pickClass(
                          selectedDate === d
                        )}`}
                      >
                        <div className="text-xs text-muted-foreground">
                          {formatted.day}
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                          {formatted.date}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatted.month}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {capsterDone && serviceDone && dateDone && (
            <motion.div
              key="time"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={transitionSoft}
            >
              <SpotlightCard className="p-6" interactive={false}>
                <div className="mb-1 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="font-heading font-semibold text-foreground">
                    {requiresCapster ? "4. Pilih jam" : "3. Pilih jam"}
                  </h2>
                </div>
                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    Jadwal capster memakai slot <strong>tetap 1 jam</strong> (10:00, 11:00,
                    12:00, …). Satu jam = satu pelanggan.
                  </p>
                  {selectedCapsterName && (
                    <p>
                      Untuk <strong>{selectedCapsterName}</strong>: hanya jam kosong yang
                      bisa dipilih. Jam penuh atau berhalangan tidak tersedia.
                    </p>
                  )}
                </div>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2
                      className="h-6 w-6 animate-spin text-primary"
                      aria-hidden
                    />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Tidak ada slot tersedia
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2.5 text-sm font-medium ${pickClass(
                          selectedTime === slot.time,
                          !slot.available
                        )}`}
                      >
                        {formatTime12(slot.time)}
                      </button>
                    ))}
                  </div>
                )}
              </SpotlightCard>
            </motion.div>
          )}

          {capsterDone && serviceDone && dateDone && timeDone && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={transitionSoft}
              className="space-y-5"
            >
              <div className="space-y-2 rounded-2xl bg-foreground p-5 text-sm text-background">
                <p className="mb-2 font-heading text-base font-semibold">
                  Ringkasan booking
                </p>
                {selectedCapsterName && (
                  <p>
                    <span className="text-background/60">Capster:</span>{" "}
                    {selectedCapsterName}
                  </p>
                )}
                <p>
                  <span className="text-background/60">Layanan:</span>{" "}
                  {selectedServiceData?.name}
                </p>
                <p>
                  <span className="text-background/60">Jadwal:</span>{" "}
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                    "id-ID",
                    { weekday: "long", day: "numeric", month: "long" }
                  )}{" "}
                  · {formatTime12(selectedTime)}
                </p>
                {selectedServiceData?.price_start != null && (
                  <p>
                    <span className="text-background/60">Estimasi:</span>{" "}
                    {formatCurrency(selectedServiceData.price_start)}
                  </p>
                )}
              </div>

              <SpotlightCard className="p-6" interactive={false}>
                <h2 className="mb-4 font-heading font-semibold text-foreground">
                  {requiresCapster ? "5. Data pelanggan" : "4. Data pelanggan"}
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">
                      <User className="mr-1 inline h-4 w-4" aria-hidden />
                      Nama
                    </Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama kamu"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">
                      <Phone className="mr-1 inline h-4 w-4" aria-hidden />
                      Nomor telepon
                    </Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">
                      <MessageSquare className="mr-1 inline h-4 w-4" aria-hidden />
                      Catatan (opsional)
                    </Label>
                    <Input
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Contoh: mau model fade"
                    />
                  </div>
                </div>
              </SpotlightCard>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !customerName || !customerPhone}
              >
                {loading && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                )}
                Konfirmasi booking
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      }
    >
      <BookingPageContent params={params} />
    </Suspense>
  );
}
