import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, MapPin, Phone, Scissors } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loginUrlWithRedirect,
  registerUrlWithRedirect,
} from "@/lib/auth/safe-redirect";
import { buttonVariants } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function PublicShopPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!business) notFound();

  const [{ data: services }, { data: capsters }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("price_start", { ascending: true }),
    supabase
      .from("staff")
      .select("id, name, role")
      .eq("business_id", business.id)
      .eq("status", "active")
      .eq("role", "capster")
      .order("name"),
  ]);

  return (
    <div className="min-h-screen bg-grid-soft">
      <header className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 0%, white 0, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mb-6 -ml-2 text-primary-foreground/90 hover:bg-white/10 hover:text-primary-foreground"
            )}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            Kembali ke beranda
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Scissors className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold sm:text-3xl">
                {business.name}
              </h1>
              <p className="text-sm text-primary-foreground/75">Barbershop</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-primary-foreground/85">
            {business.address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden />
                <span>{business.address}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" aria-hidden />
                <span>{business.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden />
              <span>
                {formatTime(business.open_time)} – {formatTime(business.close_time)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 -mt-6 pb-16">
        <SpotlightCard className="overflow-hidden p-0" interactive={false}>
          <div className="border-b border-border p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Layanan kami
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Booking online khusus member. Daftar sebagai pelanggan dulu, lalu
              pilih layanan.
            </p>
          </div>

          <div className="divide-y divide-border">
            {(services ?? []).map((service) => (
              <div
                key={service.id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">{service.name}</h3>
                  {service.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {service.duration_minutes} menit
                    </span>
                    {service.price_start != null && (
                      <span className="font-medium text-foreground">
                        {formatCurrency(service.price_start)}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={loginUrlWithRedirect(
                    `/${slug}/booking?service=${service.id}`
                  )}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "w-full shrink-0 sm:w-auto"
                  )}
                >
                  Booking
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>

          {(!services || services.length === 0) && (
            <div className="p-12 text-center text-muted-foreground">
              Belum ada layanan tersedia
            </div>
          )}
        </SpotlightCard>

        {capsters && capsters.length > 0 && (
          <SpotlightCard className="mt-6 p-6" interactive={false}>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Pilih capster
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Booking terhubung langsung ke jadwal capster yang dipilih.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {capsters.map((c) => (
                <Link
                  key={c.id}
                  href={loginUrlWithRedirect(
                    `/${slug}/booking?capster=${c.id}`
                  )}
                  className="rounded-xl border border-border p-4 text-center transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {c.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          </SpotlightCard>
        )}

        <SpotlightCard className="mt-6 p-5 text-center" interactive={false}>
          <p className="font-medium text-foreground">Khusus member pelanggan</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Non-member tidak bisa booking online. Daftar gratis sebagai pelanggan,
            lalu pilih capster & jadwal.
          </p>
          <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
            <Link
              href={registerUrlWithRedirect(`/${slug}/booking`)}
              className={buttonVariants()}
            >
              Daftar member
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={loginUrlWithRedirect(`/${slug}/booking`)}
              className={buttonVariants({ variant: "secondary" })}
            >
              Sudah member? Masuk
            </Link>
          </div>
        </SpotlightCard>
      </main>
    </div>
  );
}
