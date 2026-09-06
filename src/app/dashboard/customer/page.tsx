import Link from "next/link";
import { ArrowRight, CalendarPlus, Clock, Scissors, Ticket, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/guards";
import { getActiveServices, getCapsters, getDefaultBusiness } from "@/lib/data/business";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { BRAND_NAME, SHOP_BOOKING_PATH } from "@/lib/brand";

const rupiah = (n: number | null) =>
  n == null
    ? "-"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n);

export default async function CustomerHomePage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) return null;

  const business = await getDefaultBusiness();
  if (!business) {
    return (
      <EmptyState
        icon={Scissors}
        title={`${BRAND_NAME} belum siap`}
        description="Data barbershop belum tersedia. Jalankan seed demo lalu coba lagi."
      />
    );
  }

  const admin = createAdminClient();
  const [capsters, services, countRes] = await Promise.all([
    getCapsters(business.id),
    getActiveServices(business.id),
    admin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("customer_user_id", ctx.userId)
      .eq("business_id", business.id),
  ]);
  const bookingCount = countRes.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Halo, ${ctx.name || "Pelanggan"}`}
        description={`Booking kursi di ${BRAND_NAME} tanpa antre panjang di tempat.`}
        actions={
          <Button asChild>
            <Link href={SHOP_BOOKING_PATH}>
              <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden />
              Booking sekarang
            </Link>
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <SpotlightCard className="p-5" interactive={false}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total booking saya
            </p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {bookingCount}
            </p>
            <Link
              href="/dashboard/customer/bookings"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Lihat riwayat
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </SpotlightCard>
        </StaggerItem>

        <StaggerItem>
          <SpotlightCard className="p-5" interactive={false}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Capster tersedia
            </p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {capsters.length}
            </p>
            <Link
              href="/dashboard/customer/capsters"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Cek yang ready
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </SpotlightCard>
        </StaggerItem>

        <StaggerItem>
          <SpotlightCard className="p-5" interactive={false}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Jam operasional
            </p>
            <p className="mt-2 inline-flex items-center gap-2 font-heading text-2xl font-semibold text-foreground">
              <Clock className="h-5 w-5 text-primary" aria-hidden />
              {String(business.open_time).slice(0, 5)}–{String(business.close_time).slice(0, 5)}
            </p>
            <Link
              href="/dashboard/customer/jadwal"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Cek slot kosong
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </SpotlightCard>
        </StaggerItem>
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <SpotlightCard className="h-full p-5" interactive={false}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                <UsersRound className="h-4.5 w-4.5 text-primary" aria-hidden />
                Capster kami
              </h2>
              <Link
                href="/dashboard/customer/capsters"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Semua
              </Link>
            </div>

            {capsters.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Belum ada capster terdaftar.</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {capsters.slice(0, 4).map((capster) => (
                  <li key={capster.id} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">
                      {capster.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {capster.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SpotlightCard>
        </Reveal>

        <Reveal delay={0.06}>
          <SpotlightCard className="h-full p-5" interactive={false}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                <Ticket className="h-4.5 w-4.5 text-primary" aria-hidden />
                Layanan populer
              </h2>
              <Link
                href="/dashboard/customer/services"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Pricelist
              </Link>
            </div>

            {services.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Belum ada layanan aktif.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {services.slice(0, 4).map((service) => (
                  <li
                    key={service.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {service.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {service.duration_minutes} menit
                      </span>
                    </span>
                    <span className="shrink-0 font-medium text-accent">
                      {rupiah(service.price_start)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SpotlightCard>
        </Reveal>
      </div>
    </div>
  );
}
