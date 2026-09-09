import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Scissors,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LandingSmoothScroll from "@/components/marketing/LandingSmoothScroll";
import HeroParallaxVideo from "@/components/marketing/HeroParallaxVideo";
import { Button } from "@/components/ui/button";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import {
  BRAND_NAME,
  BRAND_NAME_HTML,
  BRAND_TAGLINE,
  SHOP_BOOKING_PATH,
  SHOP_PATH,
} from "@/lib/brand";

const SectionParallax = dynamic(
  () => import("@/components/marketing/SectionParallax")
);

const SERVICES = [
  { name: "Haircut", desc: "Potong sesuai model", price: "Rp35.000", dur: "30 mnt" },
  { name: "Shaving", desc: "Cukur jenggot & kumis", price: "Rp20.000", dur: "15 mnt" },
  { name: "Hair Wash", desc: "Cuci rambut segar", price: "Rp25.000", dur: "20 mnt" },
  { name: "Paket Komplit", desc: "Cut + shave + wash", price: "Rp70.000", dur: "60 mnt" },
];

const CAPSTERS = [
  { name: "Budi", focus: "Fade & classic" },
  { name: "Andi", focus: "Style modern" },
  { name: "Rizki", focus: "Beard & detail" },
];

const STEPS = [
  { n: "01", title: "Pilih layanan", body: "Haircut, shaving, atau paket komplit." },
  { n: "02", title: "Ambil jam", body: "Slot penuh tertutup otomatis." },
  { n: "03", title: "Datang & duduk", body: "Tunjukkan kode booking di kasir." },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* LCP: preload first hero frame only */}
      <link
        rel="preload"
        as="image"
        href="/videos/scissors-frames/001.webp"
        fetchPriority="high"
      />
      <LandingSmoothScroll />
      <Navbar />

      <HeroParallaxVideo>
        <p className="text-sm font-medium tracking-[0.16em] text-white/70 uppercase">
          {BRAND_TAGLINE}
        </p>

        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-8xl lg:leading-[0.98]">
          {BRAND_NAME_HTML.prefix}
          <span className="text-white/75">{BRAND_NAME_HTML.accent}</span>
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 sm:text-lg md:text-xl">
          Potong rapi. Booking dari HP. Datang tanpa antre lama.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:items-center">
          <Button asChild size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
            <Link href={SHOP_BOOKING_PATH}>
              Booking sekarang
              <ArrowRight
                className="ml-2 h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
          >
            <a href="#layanan">Lihat layanan</a>
          </Button>
        </div>
      </HeroParallaxVideo>

      <SectionParallax id="layanan" tone="light" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal onScroll className="max-w-xl">
            <p className="text-sm font-medium tracking-wide text-primary">Menu</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Layanan
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Harga mulai di {BRAND_NAME}. Konfirmasi akhir di kursi.
            </p>
          </Reveal>

          <Stagger
            onScroll
            className="mt-12 divide-y divide-border border-y border-border bg-card/50"
          >
            {SERVICES.map((service) => (
              <StaggerItem key={service.name}>
                <div className="group grid grid-cols-1 items-baseline gap-x-4 gap-y-1 py-6 transition-colors duration-200 hover:bg-secondary/40 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem] sm:gap-x-6 sm:px-2">
                  <div className="min-w-0">
                    <p className="font-heading text-lg font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
                      {service.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{service.desc}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">{service.dur}</p>
                  </div>
                  <p className="hidden text-sm text-muted-foreground sm:block sm:text-right">
                    {service.dur}
                  </p>
                  <p className="font-heading text-base font-semibold text-primary sm:text-right">
                    {service.price}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </SectionParallax>

      <SectionParallax id="capster" tone="raised" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal onScroll className="max-w-xl">
            <p className="text-sm font-medium tracking-wide text-primary">Tim</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Capster
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Pilih saat booking online, atau biarkan kasir yang atur kalau walk-in.
            </p>
          </Reveal>

          <Stagger onScroll className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {CAPSTERS.map((capster) => (
              <StaggerItem key={capster.name}>
                <div className="flex flex-col items-start">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary font-heading text-2xl font-bold text-primary">
                    {capster.name.charAt(0)}
                  </span>
                  <p className="mt-4 font-heading text-xl font-semibold text-foreground">
                    {capster.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{capster.focus}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal onScroll delay={0.1} className="mt-12">
            <Button asChild variant="outline" size="lg" className="h-11">
              <Link href={SHOP_PATH}>
                Lihat jadwal & siap booking
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </Reveal>
        </div>
      </SectionParallax>

      <SectionParallax id="cara-booking" tone="light" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal onScroll className="max-w-xl">
            <p className="text-sm font-medium tracking-wide text-primary">Alur</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Cara booking
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Member pesan online. Belum punya akun? Datang walk-in ke kasir.
            </p>
          </Reveal>

          <Stagger onScroll className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step) => (
              <StaggerItem key={step.n}>
                <div>
                  <p className="font-mono text-sm font-semibold text-primary">{step.n}</p>
                  <p className="mt-3 font-heading text-lg font-semibold text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal onScroll delay={0.12} className="mt-12">
            <Button asChild size="lg" className="h-12 px-6">
              <Link href={SHOP_BOOKING_PATH}>
                <CalendarDays className="mr-2 h-4 w-4" aria-hidden />
                Mulai booking
              </Link>
            </Button>
          </Reveal>
        </div>
      </SectionParallax>

      <SectionParallax id="jam" tone="primary" className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal onScroll>
            <p className="text-sm font-medium tracking-wide text-primary-foreground/75">
              Lokasi
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Kunjungi {BRAND_NAME}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-primary-foreground/80">
              Satu lokasi. Booking online atau datang langsung — antreannya tetap teratur.
            </p>
          </Reveal>

          <Reveal onScroll delay={0.08} className="space-y-5 self-center">
            <p className="flex items-start gap-3 text-base">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 opacity-90" aria-hidden />
              <span>Jl. Sudirman No. 1</span>
            </p>
            <p className="flex items-start gap-3 text-base">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 opacity-90" aria-hidden />
              <span>Setiap hari · 10:00–21:00</span>
            </p>
            <p className="flex items-start gap-3 text-base">
              <Scissors className="mt-0.5 h-5 w-5 shrink-0 opacity-90" aria-hidden />
              <span>Walk-in non-member & booking member</span>
            </p>
            <div className="pt-3">
              <Button
                asChild
                size="lg"
                className="h-12 bg-primary-foreground px-6 text-primary hover:bg-primary-foreground/90"
              >
                <Link href={SHOP_BOOKING_PATH}>Booking sekarang</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </SectionParallax>

      <Footer />
    </div>
  );
}
