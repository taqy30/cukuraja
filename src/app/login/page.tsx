"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldUser } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import {
  DEMO_CREDENTIALS_KEY,
  DEMO_FILL_EVENT,
  type DemoCredentials,
} from "@/components/DemoLauncher";
import { BrandMark } from "@/components/BrandMark";
import { askAlert } from "@/components/feedback/ConfirmHost";
import { ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { FormError } from "@/components/ui/modal";
import { Reveal } from "@/components/motion";
import { BRAND_NAME } from "@/lib/brand";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectPath(searchParams.get("redirect"));
  const registeredBusiness = searchParams.get("registered") === "business";
  const registeredSlug = searchParams.get("slug");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apply = (creds: DemoCredentials) => {
      setEmail(creds.email);
      setPassword(creds.password);
      setError(null);
    };

    const onFill = (event: Event) => {
      const detail = (event as CustomEvent<DemoCredentials>).detail;
      if (detail?.email && detail?.password) apply(detail);
    };

    window.addEventListener(DEMO_FILL_EVENT, onFill);

    try {
      const raw = sessionStorage.getItem(DEMO_CREDENTIALS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoCredentials;
        if (parsed?.email && parsed?.password) {
          apply(parsed);
          sessionStorage.removeItem(DEMO_CREDENTIALS_KEY);
        }
      }
    } catch {
      /* ignore */
    }

    return () => window.removeEventListener(DEMO_FILL_EVENT, onFill);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Gagal masuk");
      setLoading(false);
      return;
    }

    const meRes = await fetch("/api/me");
    if (!meRes.ok) {
      const supabase = createClient();
      await supabase.auth.signOut();
      setError(
        "Akun belum terhubung. Untuk demo: jalankan npm run seed:reset."
      );
      setLoading(false);
      return;
    }

    const me = await meRes.json();
    setLoading(false);

    const roleLabel = ROLE_LABEL[(me.role as AppRole) ?? "customer"] ?? "Pengguna";
    const destination =
      redirectTo && me.role === "customer" ? redirectTo : "/dashboard";

    await askAlert({
      title: "Login berhasil",
      description: `Selamat datang, ${me.name || roleLabel}. Anda masuk sebagai ${roleLabel}.`,
      confirmLabel: "Ke dashboard",
      autoCloseMs: 2800,
    });

    router.push(destination);
    router.refresh();
  };

  return (
    <Reveal className="w-full max-w-[26rem]">
      <div className="text-center">
        <BrandMark href="/" size="lg" />
        <h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight text-foreground">
          Masuk
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {redirectTo
            ? "Login diperlukan untuk melanjutkan booking."
            : registeredBusiness
              ? "Akun siap. Masuk untuk membuka dashboard."
              : `Masuk ke dashboard ${BRAND_NAME}.`}
        </p>
      </div>

      {registeredBusiness && (
        <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          Akun owner berhasil dibuat
          {registeredSlug ? (
            <>
              . Halaman publik:{" "}
              <Link
                href={`/${registeredSlug}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                /{registeredSlug}
              </Link>
            </>
          ) : (
            "."
          )}
        </div>
      )}

      <SpotlightCard className="mt-6 p-6 sm:p-7" interactive={false}>
        <form onSubmit={handleLogin} className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@contoh.com"
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Masuk
          </Button>
        </form>
      </SpotlightCard>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-card/80 px-3.5 py-3 text-left">
        <ShieldUser className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Butuh akun demo? Buka ikon shield di kiri bawah — berisi role, email, dan
          password (termasuk semua capster).
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun member?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Daftar
        </Link>
      </p>
    </Reveal>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-soft opacity-70" />
      <div className="relative z-10 w-full max-w-[26rem]">
        <Suspense
          fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />}
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
