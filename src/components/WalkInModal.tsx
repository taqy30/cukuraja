"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
  duration_minutes?: number;
}

interface Slot {
  time: string;
  available: boolean;
  status?: string;
  reason?: string | null;
  customer_name?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  businessId: string;
  services: Option[];
  capsters: Option[];
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Walk-in: pilih capster + jam penuh.
 * Jam yang penuh / berhalangan tidak bisa dipilih.
 */
export default function WalkInModal({
  open,
  onClose,
  onSaved,
  businessId,
  services,
  capsters,
}: Props) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    service_id: "",
    assigned_capster_id: "",
    booking_date: todayLocal(),
    booking_time: "",
    note: "",
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      customer_name: "",
      customer_phone: "",
      service_id: services[0]?.id ?? "",
      assigned_capster_id: capsters[0]?.id ?? "",
      booking_date: todayLocal(),
      booking_time: "",
      note: "",
    });
  }, [open, services, capsters]);

  useEffect(() => {
    if (!open || !businessId || !form.assigned_capster_id || !form.booking_date) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    async function load() {
      setSlotsLoading(true);
      setForm((f) => ({ ...f, booking_time: "" }));
      const params = new URLSearchParams({
        business_id: businessId,
        date: form.booking_date,
        capster_id: form.assigned_capster_id,
      });
      const res = await fetch(`/api/slots?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!cancelled) {
        setSlots(data.slots ?? []);
        setSlotsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, businessId, form.assigned_capster_id, form.booking_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assigned_capster_id || !form.booking_time) {
      setError("Pilih capster dan jam yang masih kosong");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/walk-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        service_id: form.service_id,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        assigned_capster_id: form.assigned_capster_id,
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        note: form.note.trim() || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menambah walk-in");
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Walk-in (non-member)"
      description="Tidak perlu buat akun. Cukup nama (dan WhatsApp opsional). Member yang mau reservasi terjadwal tetap lewat booking online."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Walk-in dicatat sebagai non-member di antrean. Tidak membuat akun login.
        </p>

        <div className="space-y-2">
          <Label htmlFor="wi-name">Nama pelanggan</Label>
          <Input
            id="wi-name"
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            placeholder="Nama yang dipanggil saat antrean"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wi-phone">
            Nomor WhatsApp <span className="text-muted-foreground">(opsional)</span>
          </Label>
          <Input
            id="wi-phone"
            type="tel"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wi-service">Layanan</Label>
          <select
            id="wi-service"
            value={form.service_id}
            onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            required
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
          >
            <option value="">Pilih layanan</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wi-capster">Capster</Label>
            <select
              id="wi-capster"
              value={form.assigned_capster_id}
              onChange={(e) =>
                setForm({ ...form, assigned_capster_id: e.target.value, booking_time: "" })
              }
              required
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">Pilih capster</option>
              {capsters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wi-date">Tanggal</Label>
            <Input
              id="wi-date"
              type="date"
              value={form.booking_date}
              onChange={(e) =>
                setForm({ ...form, booking_date: e.target.value, booking_time: "" })
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Jam (slot 1 jam)</Label>
          {slotsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pilih capster untuk melihat jam.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slots.map((slot) => {
                const selected = form.booking_time === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    title={
                      slot.status === "blocked"
                        ? slot.reason || "Berhalangan"
                        : slot.status === "booked"
                          ? `Terisi: ${slot.customer_name ?? "-"}`
                          : undefined
                    }
                    onClick={() => setForm({ ...form, booking_time: slot.time })}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition",
                      !slot.available &&
                        "cursor-not-allowed border-border/60 bg-muted/50 text-muted-foreground/50",
                      slot.available &&
                        !selected &&
                        "border-border hover:border-primary/40 hover:bg-primary/5",
                      selected && "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    )}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Abu-abu = penuh / berhalangan / sudah lewat. Hijau pilihan = jam yang dipakai walk-in.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wi-note">Catatan (opsional)</Label>
          <Input
            id="wi-note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        <Button
          type="submit"
          disabled={saving || !form.booking_time || !form.assigned_capster_id}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
          )}
          Tambah ke antrean
        </Button>
      </form>
    </Modal>
  );
}
