"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Tag,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { askConfirm } from "@/components/feedback/ConfirmHost";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/role-badge";
import { transitionSoft } from "@/components/motion";
import { BRAND_NAME, SHOP_BOOKING_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/customer", label: "Beranda", icon: Home },
  { href: "/dashboard/customer/capsters", label: "Capster Ready", icon: UsersRound },
  { href: "/dashboard/customer/services", label: "Pricelist", icon: Tag },
  { href: "/dashboard/customer/jadwal", label: "Cek Jadwal", icon: CalendarDays },
  { href: "/dashboard/customer/bookings", label: "Booking Saya", icon: Ticket },
];

interface Props {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export default function CustomerDashboardShell({
  userName,
  userEmail,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const ok = await askConfirm({
      title: "Yakin ingin logout?",
      description: "Anda akan keluar dari akun pelanggan dan perlu login lagi untuk kembali.",
      confirmLabel: "Ya, keluar",
      cancelLabel: "Batal",
      danger: true,
    });
    if (!ok) return;

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const brand = <BrandMark href="/" size="sm" iconClassName="bg-primary/10 text-primary" />;

  const navList = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-slim">
      {NAV.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="customer-nav-active"
                className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                transition={transitionSoft}
                aria-hidden
              />
            )}
            <item.icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const footerBlock = (
    <div className="space-y-2 border-t border-sidebar-border px-3 py-3">
      <Button asChild className="w-full">
        <Link href={SHOP_BOOKING_PATH}>
          <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden />
          Booking baru
        </Link>
      </Button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          aria-expanded={profileOpen}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-muted"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {userName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              profileOpen && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={transitionSoft}
              className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-soft-lg)]"
            >
              <div className="border-b border-border px-3 py-2.5">
                <RoleBadge role="customer" />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-destructive transition-colors duration-200 hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Keluar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">{brand}</div>
        <div className="border-b border-sidebar-border px-5 py-3.5">
          <p className="text-xs text-muted-foreground">Member</p>
          <p className="truncate text-sm font-medium text-foreground">{BRAND_NAME}</p>
        </div>
        {navList}
        {footerBlock}
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitionSoft}
              className="fixed inset-0 bg-foreground/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={transitionSoft}
              className="relative flex max-h-full w-72 flex-col bg-sidebar"
            >
              <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
                {brand}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Tutup menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="border-b border-sidebar-border px-5 py-3">
                <p className="text-xs text-muted-foreground">Member</p>
                <p className="truncate text-sm font-medium text-foreground">{BRAND_NAME}</p>
              </div>
              {navList}
              {footerBlock}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          {brand}
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
