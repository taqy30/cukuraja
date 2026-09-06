import Link from "next/link";
import { CalendarPlus, Clock, Info, Scissors } from "lucide-react";
import { getActiveServices, getDefaultBusiness } from "@/lib/data/business";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stagger, StaggerItem } from "@/components/motion";
import { BRAND_NAME, SHOP_BOOKING_PATH } from "@/lib/brand";

const rupiah = (n: number | null) =>
  n == null
    ? "Tanya kasir"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n);

export default async function CustomerServicesPage() {
  const business = await getDefaultBusiness();
  const services = business ? await getActiveServices(business.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricelist"
        description={`Harga mulai di ${BRAND_NAME}. Durasi menentukan panjang slot booking Anda.`}
        actions={
          <Button asChild>
            <Link href={SHOP_BOOKING_PATH}>
              <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden />
              Booking sekarang
            </Link>
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-secondary-foreground">
          Harga bisa berbeda tergantung panjang rambut dan permintaan model. Konfirmasi akhir
          dilakukan di tempat.
        </p>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Belum ada layanan"
          description={`${BRAND_NAME} belum menambahkan daftar layanan.`}
        />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <StaggerItem key={service.id}>
              <SpotlightCard className="flex h-full flex-col p-5">
                <h2 className="font-heading text-base font-semibold text-foreground">
                  {service.name}
                </h2>
                {service.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{service.description}</p>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" aria-hidden />
                    {service.duration_minutes} menit
                  </span>
                  <span className="font-heading text-base font-semibold text-accent">
                    {rupiah(service.price_start)}
                  </span>
                </div>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
