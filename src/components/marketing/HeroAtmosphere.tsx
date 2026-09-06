"use client";

import Image from "next/image";

/** Latar hero full-bleed: foto barbershop + atmosfer brand. */
export default function HeroAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src="/images/hero-barber.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_30%] scale-105 animate-[hero-drift_28s_ease-in-out_infinite_alternate]"
      />
      {/* Scrim baca: gelap kiri/bawah, biar brand & CTA jelas */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,_rgba(4,20,31,0.82)_0%,_rgba(4,20,31,0.55)_42%,_rgba(4,20,31,0.35)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(4,20,31,0.45)_0%,_transparent_35%,_rgba(15,23,42,0.55)_100%)]" />
      {/* Aksen brand soft */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_15%_80%,_rgb(2_132_199_/_0.28)_0%,_transparent_60%)]" />
    </div>
  );
}
