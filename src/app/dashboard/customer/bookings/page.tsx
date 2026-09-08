import Link from "next/link";
import { ArrowRight, CalendarPlus, Clock, Scissors, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/guards";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stagger, StaggerItem } from "@/components/motion";
import { BRAND_NAME, SHOP_BOOKING_PATH } from "@/lib/brand";

interface BookingRow {
  id: string;
  booking_code: string;
  booking_date: string;
  booking_time: string;
  status: string;
  note: string | null;
  service: { name: string } | null;
  capster: { name: string } | null;
}

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);

  let bookings: BookingRow[] = [];

  if (ctx?.userId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("bookings")
      .select(
        "id, booking_code, booking_date, booking_time, status, note, service:services(name), capster:staff!bookings_assigned_capster_id_fkey(name)"
      )
      .eq("customer_user_id", ctx.userId)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false })
      .limit(40);

    bookings = (data ?? []) as unknown as BookingRow[];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Saya"
        description={`Riwayat reservasi online di ${BRAND_NAME}. Walk-in non-member tidak muncul di sini.`}
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link href={SHOP_BOOKING_PATH}>
              <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden />
              Booking baru
            </Link>
          </Button>
        }
      />

      {bookings.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Belum ada booking"
          description="Booking online pertama Anda akan muncul di sini beserta kode antreannya."
          action={
            <Button asChild>
              <Link href={SHOP_BOOKING_PATH}>
                <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden />
                Buat booking
              </Link>
            </Button>
          }
        />
      ) : (
        <Stagger className="space-y-3">
          {bookings.map((booking) => (
            <StaggerItem key={booking.id}>
              <SpotlightCard className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground">
                    {booking.booking_code}
                  </span>
                  <StatusBadge status={booking.status} />
                  <Link
                    href={`/ticket/${booking.booking_code}`}
                    className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Lihat tiket
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>

                <p className="mt-3 font-medium text-foreground">
                  {formatDate(booking.booking_date)}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden />
                    {String(booking.booking_time).slice(0, 5)}
                  </span>
                  {booking.service?.name && (
                    <span className="inline-flex items-center gap-1.5">
                      <Scissors className="h-4 w-4" aria-hidden />
                      {booking.service.name}
                    </span>
                  )}
                  {booking.capster?.name && <span>Capster: {booking.capster.name}</span>}
                </div>

                {booking.note && (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {booking.note}
                  </p>
                )}
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
