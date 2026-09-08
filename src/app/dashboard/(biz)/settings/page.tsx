"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/modal";
import { PageTransition, Reveal } from "@/components/motion";
import { RequirePermission } from "@/components/RequirePermission";

interface Business {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  open_time: string;
  close_time: string;
  active_barbers: number;
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    open_time: "10:00",
    close_time: "21:00",
    active_barbers: "1",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Gagal memuat pengaturan");
      setLoading(false);
      return;
    }

    const biz = data.business as Business;
    setBusiness(biz);
    setForm({
      name: biz.name,
      address: biz.address ?? "",
      phone: biz.phone ?? "",
      open_time: String(biz.open_time).slice(0, 5),
      close_time: String(biz.close_time).slice(0, 5),
      active_barbers: String(biz.active_barbers),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        address: form.address,
        phone: form.phone,
        open_time: form.open_time,
        close_time: form.close_time,
        active_barbers: Number(form.active_barbers),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan pengaturan");
      return;
    }

    setBusiness(data.business);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <RequirePermission permission="settings.manage">
    <PageTransition className="space-y-6">
      <PageHeader
        title="Pengaturan Barbershop"
        description="Profil publik dan jam operasional. Jam buka-tutup menentukan slot booking yang tersedia bagi pelanggan."
      />

      <FormError message={error} />

      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <SpotlightCard className="h-full p-5" interactive={false}>
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
              <Store className="h-4.5 w-4.5 text-primary" aria-hidden />
              Profil
            </h2>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="se-name">Nama barbershop</Label>
                <Input
                  id="se-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="se-slug">Alamat halaman publik</Label>
                <Input
                  id="se-slug"
                  value={`/${business?.slug ?? ""}`}
                  readOnly
                  disabled
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Slug tidak bisa diubah agar link booking pelanggan tetap berfungsi.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="se-address">Alamat</Label>
                <Input
                  id="se-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="se-phone">Nomor telepon</Label>
                <Input
                  id="se-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={0.06}>
          <SpotlightCard className="flex h-full flex-col p-5" interactive={false}>
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
              <Clock className="h-4.5 w-4.5 text-primary" aria-hidden />
              Jam operasional
            </h2>

            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="se-open">Jam buka</Label>
                  <Input
                    id="se-open"
                    type="time"
                    value={form.open_time}
                    onChange={(e) => setForm({ ...form, open_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="se-close">Jam tutup</Label>
                  <Input
                    id="se-close"
                    type="time"
                    value={form.close_time}
                    onChange={(e) => setForm({ ...form, close_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="se-barbers">Jumlah barber aktif</Label>
                <Input
                  id="se-barbers"
                  type="number"
                  min={1}
                  max={50}
                  value={form.active_barbers}
                  onChange={(e) => setForm({ ...form, active_barbers: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Dipakai sebagai kapasitas per slot saat booking tidak memilih capster
                  tertentu.
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Simpan pengaturan
              </Button>
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Tersimpan
                </span>
              )}
            </div>
          </SpotlightCard>
        </Reveal>
      </form>
    </PageTransition>
    </RequirePermission>
  );
}
