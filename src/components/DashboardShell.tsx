"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Store,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bizNavFor } from "@/lib/auth/nav";
import { ROLE_DESCRIPTION, type AppRole } from "@/lib/auth/roles";
import { BrandMark } from "@/components/BrandMark";
import { askConfirm } from "@/components/feedback/ConfirmHost";
import { RoleBadge } from "@/components/ui/role-badge";
import { transitionSoft } from "@/components/motion";
import { cn } from "@/lib/utils";

interface Props {
  role: AppRole;
  userName: string;
  userEmail: string;
  business: { name: string; slug: string } | null;
  children: React.ReactNode;
}

export default function DashboardShell({
  role,
  userName,
  userEmail,
  business,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navItems = bizNavFor(role);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const ok = await askConfirm({
      title: "Yakin ingin logout?",
      description: "Anda akan keluar dari dashboard dan perlu login lagi untuk kembali.",
      confirmLabel: "Logout",
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
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nav-active-bar"
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

  const profileBlock = (
    <div className="border-t border-sidebar-border px-3 py-3">
      {business && (
        <Link
          href={`/${business.slug}`}
          target="_blank"
          className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Halaman booking publik
        </Link>
      )}
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
                <RoleBadge role={role} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {ROLE_DESCRIPTION[role]}
                </p>
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

        {business && (
          <div className="border-b border-sidebar-border px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Store className="h-4 w-4 text-secondary-foreground" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{business.name}</p>
                <p className="truncate text-xs text-muted-foreground">/{business.slug}</p>
              </div>
            </div>
          </div>
        )}

        {navList}
        {profileBlock}
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
              {navList}
              {profileBlock}
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
          <div className="ml-auto">
            <RoleBadge role={role} showIcon={false} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
