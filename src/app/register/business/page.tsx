"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { FormError } from "@/components/ui/modal";
import { Reveal } from "@/components/motion";
import { BrandMark } from "@/components/BrandMark";
import { slugify } from "@/lib/validation/input";
import { BRAND_NAME, SHOP_SLUG } from "@/lib/brand";

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");
  const [openTime, setOpenTime] = useState("10:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedSlug = useMemo(() => (slugManual ? slug : slugify(businessName)), [slugManual, slug, businessName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        owner_name: ownerName.trim(),
        owner_phone: phone.trim() || null,
        business_name: businessName.trim(),
        slug: computedSlug,
        address: address.trim() || null,
        open_time: openTime,
        close_time: closeTime,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal mendaftarkan barbershop");
      return;
    }

    router.push(`/login?registered=business&slug=${encodeURIComponent(data.business?.slug ?? computedSlug)}`);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid-soft px-4 py-12">
      <Reveal className="w-full max-w-lg">
        <div className="text-center">
          <BrandMark href="/" size="lg" iconClassName="bg-primary/10 text-primary" />
          <h1 className="mt-6 font-heading text-xl font-semibold text-foreground">
            Setup internal {BRAND_NAME}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Halaman ini untuk setup demo/internal. Produk utama adalah barbershop {BRAND_NAME}.
          </p>
        </div>

        <SpotlightCard className="mt-6 p-4 sm:p-6" interactive={false}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError message={error} />

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Akun owner
            </p>

            <div className="space-y-2">
              <Label htmlFor="owner-name">Nama lengkap</Label>
              <Input
                id="owner-name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nama pemilik"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-email">Email login</Label>
              <Input
                id="owner-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@contoh.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-phone">
                WhatsApp <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="owner-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-password">Password</Label>
              <div className="relative">
                <Input
                  id="owner-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter, huruf + angka"
                  minLength={8}
                  required
                  className="pr-11"
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

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Profil barbershop
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biz-name">Nama barbershop</Label>
              <Input
                id="biz-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Contoh: Barbershop Taqy"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="biz-slug">Alamat booking (slug)</Label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">/</span>
                <Input
                  id="biz-slug"
                  value={computedSlug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  placeholder={SHOP_SLUG}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Path publik toko, contoh: /{SHOP_SLUG}. Pelanggan booking di yoursite.com/
                {SHOP_SLUG}. Walk-in non-member tetap bisa dilayani kasir tanpa akun.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biz-address">
                Alamat <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="biz-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Contoh No. 1"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="open-time">Buka</Label>
                <Input
                  id="open-time"
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close-time">Tutup</Label>
                <Input
                  id="close-time"
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Buat barbershop
            </Button>
          </form>
        </SpotlightCard>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Mau booking sebagai pelanggan?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Daftar pelanggan
          </Link>
          {" · "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Masuk
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
