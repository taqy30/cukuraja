"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { QueueBooking } from "@/components/BookingQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, Modal } from "@/components/ui/modal";

interface Option {
  id: string;
  name: string;
  duration_minutes?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  businessId: string;
  services: Option[];
  capsters: Option[];
  booking?: QueueBooking | null;
}

const emptyForm = {
  customer_name: "",
  customer_phone: "",
  service_id: "",
  assigned_capster_id: "",
  booking_date: "",
  booking_time: "",
  note: "",
};

/** Form tambah/ubah booking untuk owner & admin. */
export default function BookingFormModal({
  open,
  onClose,
  onSaved,
  businessId,
  services,
  capsters,
  booking,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!booking;

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (booking) {
      setForm({
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        service_id: booking.service_id ?? booking.service?.id ?? "",
        assigned_capster_id: booking.capster?.id ?? "",
        booking_date: booking.booking_date ?? new Date().toISOString().split("T")[0],
        booking_time: String(booking.booking_time).slice(0, 5),
        note: booking.note ?? "",
      });
    } else {
      setForm({
        ...emptyForm,
        booking_date: new Date().toISOString().split("T")[0],
        service_id: services[0]?.id ?? "",
      });
    }
  }, [open, booking, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      business_id: businessId,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      service_id: form.service_id,
      assigned_capster_id: form.assigned_capster_id || null,
      booking_date: form.booking_date,
      booking_time: form.booking_time,
      note: form.note.trim() || null,
    };

    const res = await fetch(isEdit ? `/api/booking/${booking!.id}` : "/api/booking", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan booking");
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Booking" : "Tambah Booking"}
      description={
        isEdit
          ? "Perubahan jadwal akan divalidasi terhadap ketersediaan capster."
          : "Booking terjadwal dibantu staff. Untuk pelanggan datang langsung, gunakan Walk-in."
      }
    >
      <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bf-name">Nama pelanggan</Label>
            <Input
              id="bf-name"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bf-phone">Nomor WhatsApp</Label>
            <Input
              id="bf-phone"
              type="tel"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bf-service">Layanan</Label>
          <select
            id="bf-service"
            value={form.service_id}
            onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            required
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors duration-200 focus-visible:border-ring"
          >
            <option value="">Pilih layanan</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.duration_minutes ? ` · ${s.duration_minutes} menit` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bf-capster">Capster</Label>
          <select
            id="bf-capster"
            value={form.assigned_capster_id}
            onChange={(e) => setForm({ ...form, assigned_capster_id: e.target.value })}
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors duration-200 focus-visible:border-ring"
          >
            <option value="">Belum ditentukan</option>
            {capsters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bf-date">Tanggal</Label>
            <Input
              id="bf-date"
              type="date"
              value={form.booking_date}
              onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bf-time">Jam</Label>
            <Input
              id="bf-time"
              type="time"
              value={form.booking_time}
              onChange={(e) => setForm({ ...form, booking_time: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bf-note">Catatan (opsional)</Label>
          <Input
            id="bf-note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Contoh: minta model fade"
          />
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {isEdit ? "Simpan perubahan" : "Tambah booking"}
        </Button>
      </form>
    </Modal>
  );
}
