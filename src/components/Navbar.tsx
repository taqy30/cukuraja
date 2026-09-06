"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { transitionSoft } from "@/components/motion";
import { SHOP_BOOKING_PATH, SHOP_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#layanan", label: "Layanan" },
  { href: "#capster", label: "Capster" },
  { href: "#cara-booking", label: "Cara booking" },
  { href: "#jam", label: "Jam buka" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHero = !scrolled && !open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        scrolled || open
          ? "border-b border-border bg-background/92 shadow-[var(--shadow-soft-sm)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark href="/" size="sm" inverse={onHero} onClick={() => setOpen(false)} />

        <nav className="ml-8 hidden items-center gap-0.5 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                onHero
                  ? "text-white/75 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn("h-9", onHero && "text-white hover:bg-white/10 hover:text-white")}
          >
            <Link href="/login">Masuk</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className={cn("h-9", onHero && "bg-white text-slate-900 hover:bg-white/90")}
          >
            <Link href={SHOP_BOOKING_PATH}>Booking sekarang</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          className={cn(
            "ml-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 md:hidden",
            onHero
              ? "text-white/80 hover:bg-white/10 hover:text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitionSoft}
            className="overflow-hidden border-b border-border bg-background md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <Button asChild variant="outline" className="h-10 w-full">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild className="h-10 w-full">
                  <Link href={SHOP_BOOKING_PATH}>Booking sekarang</Link>
                </Button>
                <Button asChild variant="ghost" className="h-10 w-full">
                  <Link href={SHOP_PATH}>Halaman toko</Link>
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
