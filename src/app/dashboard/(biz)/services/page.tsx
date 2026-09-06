"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { FormError, Modal } from "@/components/ui/modal";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { askConfirm } from "@/components/feedback/ConfirmHost";
import { notify } from "@/lib/notify";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_start: number | null;
}

const rupiah = (n: number | null) =>
  n == null
    ? "Belum diatur"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n);

const emptyForm = { name: "", description: "", duration_minutes: "30", price_start: "" };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPageError(null);
    const res = await fetch("/api/services");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPageError(data.error ?? "Gagal memuat layanan");
      setLoading(false);
      return;
    }

    setServices(data.services ?? []);
    setCanManage(!!data.canManage);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: String(service.duration_minutes),
      price_start: service.price_start != null ? String(service.price_start) : "",
    });
    setError(null);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(editing ? `/api/services/${editing.id}` : "/api/services", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        duration_minutes: form.duration_minutes,
        price_start: form.price_start,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan layanan");
      return;
    }

    setModalOpen(false);
    await load();
  };

  const remove = async (service: Service) => {
    const ok = await askConfirm({
      title: `Hapus layanan "${service.name}"?`,
      description: "Layanan akan dikeluarkan dari daftar aktif dan tidak lagi tersedia untuk booking.",
      confirmLabel: "Hapus layanan",
      danger: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Gagal menghapus layanan";
      setPageError(message);
      notify.error(message);
      return;
    }
    notify.success("Layanan berhasil dihapus");
    await load();
  };

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        title="Layanan & Harga"
        description={
          canManage
            ? "Kelola daftar layanan, durasi, dan harga mulai. Durasi menentukan panjang slot booking."
            : "Daftar layanan aktif barbershop. Hanya owner dan admin yang bisa mengubahnya."
        }
        actions={
          canManage && (
            <Button type="button" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Tambah layanan
            </Button>
          )
        }
      />

      <FormError message={pageError} />

      {loading ? (
        <SkeletonList count={3} />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Belum ada layanan"
          description={
            canManage
              ? "Tambahkan minimal satu layanan agar pelanggan bisa mulai booking."
              : "Hubungi owner untuk menambahkan layanan."
          }
          action={
            canManage && (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Tambah layanan
              </Button>
            )
          }
        />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <StaggerItem key={service.id}>
              <SpotlightCard className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      {service.name}
                    </h2>
                    {service.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Ubah ${service.name}`}
                        onClick={() => openEdit(service)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Hapus ${service.name}`}
                        onClick={() => remove(service)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>

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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Ubah Layanan" : "Tambah Layanan"}
        description="Durasi dipakai sistem untuk membentuk slot jam booking."
      >
        <form onSubmit={save} className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="sv-name">Nama layanan</Label>
            <Input
              id="sv-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Haircut"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sv-desc">Deskripsi (opsional)</Label>
            <Input
              id="sv-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sv-duration">Durasi (menit)</Label>
              <Input
                id="sv-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sv-price">Harga mulai (Rp)</Label>
              <Input
                id="sv-price"
                type="number"
                min={0}
                step={1000}
                value={form.price_start}
                onChange={(e) => setForm({ ...form, price_start: e.target.value })}
                placeholder="35000"
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {editing ? "Simpan perubahan" : "Tambah layanan"}
          </Button>
        </form>
      </Modal>
    </PageTransition>
  );
}
