"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { getSafeRedirectPath, loginUrlWithRedirect } from "@/lib/auth/safe-redirect";
import { BrandMark } from "@/components/BrandMark";
import { askAlert } from "@/components/feedback/ConfirmHost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { FormError } from "@/components/ui/modal";
import { Reveal } from "@/components/motion";
import { BRAND_NAME, SHOP_BOOKING_PATH } from "@/lib/brand";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectPath(searchParams.get("redirect"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Gagal mendaftar");
      setLoading(false);
      return;
    }

    setLoading(false);
    const destination = redirectTo ?? "/dashboard/customer";

    await askAlert({
      title: "Pendaftaran berhasil",
      description: `Akun member ${BRAND_NAME} siap digunakan.`,
      confirmLabel: "Lanjut",
      autoCloseMs: 2500,
    });

    router.push(destination);
    router.refresh();
  };

  return (
    <Reveal className="w-full max-w-[26rem]">
      <div className="text-center">
        <BrandMark href="/" size="lg" />
        <h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight text-foreground">
          Daftar member
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {redirectTo
            ? "Setelah daftar, Anda langsung lanjut booking."
            : `Buat akun untuk booking online di ${BRAND_NAME}.`}
        </p>
      </div>

      <SpotlightCard className="mt-6 p-6 sm:p-7" interactive={false}>
        <form onSubmit={handleRegister} className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="name">Nama lengkap</Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
              required
              className="h-11"
            />
          </div>

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
            <Label htmlFor="phone">
              WhatsApp <span className="font-normal text-muted-foreground">(opsional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 karakter"
                minLength={8}
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
            Daftar
          </Button>
        </form>
      </SpotlightCard>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href={redirectTo ? loginUrlWithRedirect(redirectTo) : "/login"}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
        {" · "}
        <Link
          href={SHOP_BOOKING_PATH}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Booking
        </Link>
      </p>
    </Reveal>
  );
}

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-soft opacity-70" />
      <div className="relative z-10 w-full max-w-[26rem]">
        <Suspense
          fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />}
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
