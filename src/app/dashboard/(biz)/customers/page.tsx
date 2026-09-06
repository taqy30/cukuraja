"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { FormError, Modal } from "@/components/ui/modal";
import { PageTransition, Reveal } from "@/components/motion";
import { RequirePermission } from "@/components/RequirePermission";
import { askConfirm } from "@/components/feedback/ConfirmHost";
import { notify } from "@/lib/notify";

interface Customer {
  id: string;
  name: string;
  phone: string;
  bookings: number;
  completed: number;
  lastVisit: string;
  type: "registered" | "guest";
}

const emptyForm = { name: "", phone: "", email: "", password: "" };

const formatDate = (value: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPageError(null);
    const res = await fetch("/api/customers");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPageError(data.error ?? "Gagal memuat pelanggan");
      setLoading(false);
      return;
    }

    setCustomers(data.customers ?? []);
    setCanManage(!!data.canManage);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [customers, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({ name: customer.name, phone: customer.phone, email: "", password: "" });
    setError(null);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = editing
      ? await fetch(`/api/customers/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, phone: form.phone }),
        })
      : await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan pelanggan");
      return;
    }

    setModalOpen(false);
    await load();
  };

  const remove = async (customer: Customer) => {
    const ok = await askConfirm({
      title: `Hapus pelanggan ${customer.name}?`,
      description:
        "Seluruh riwayat booking pelanggan ini di barbershop Anda juga akan dihapus.",
      confirmLabel: "Hapus pelanggan",
      danger: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/customers/${encodeURIComponent(customer.id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Gagal menghapus pelanggan";
      setPageError(message);
      notify.error(message);
      return;
    }
    notify.success("Pelanggan berhasil dihapus");
    await load();
  };

  return (
    <RequirePermission permission="customer.read">
    <PageTransition className="space-y-6">
      <PageHeader
        title="Pelanggan"
        description={
          canManage
            ? "Member = akun reservasi online. Non-member = walk-in tanpa akun. Owner bisa menambah member baru."
            : "Member punya akun booking online; non-member hanya dari walk-in tanpa akun."
        }
        actions={
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                aria-label="Cari pelanggan"
                placeholder="Cari nama atau nomor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 sm:w-64"
              />
            </div>
            {canManage && (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Tambah pelanggan
              </Button>
            )}
          </>
        }
      />

      <FormError message={pageError} />

      {loading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title={query ? "Tidak ada hasil" : "Belum ada pelanggan"}
          description={
            query
              ? "Coba kata kunci lain atau kosongkan kolom pencarian."
              : "Data pelanggan akan muncul otomatis setelah booking pertama masuk."
          }
        />
      ) : (
        <Reveal>
          <SpotlightCard className="overflow-hidden p-0" interactive={false}>
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border bg-surface-raised">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      WhatsApp
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Tipe
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Booking
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Selesai
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Terakhir
                    </th>
                    {canManage && <th className="px-4 py-3 text-right sr-only">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition-colors duration-200 hover:bg-muted/60"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.phone}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor:
                              customer.type === "registered"
                                ? "var(--status-completed-bg)"
                                : "var(--muted)",
                            color:
                              customer.type === "registered"
                                ? "var(--status-completed)"
                                : "var(--muted-foreground)",
                          }}
                        >
                          {customer.type === "registered" ? "Member" : "Non-member"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {customer.bookings}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {customer.completed}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(customer.lastVisit)}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Ubah ${customer.name}`}
                              onClick={() => openEdit(customer)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Hapus ${customer.name}`}
                              onClick={() => remove(customer)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SpotlightCard>
        </Reveal>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Ubah Pelanggan" : "Tambah Member"}
        description={
          editing
            ? "Perubahan nama dan nomor akan disinkronkan ke seluruh riwayat booking."
            : "Buat akun member agar pelanggan bisa reservasi online. Walk-in non-member tidak perlu akun."
        }
      >
        <form onSubmit={save} className="space-y-4">
          <FormError message={error} />

          {!editing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cu-email">Email login</Label>
                <Input
                  id="cu-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cu-password">Password</Label>
                <Input
                  id="cu-password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="cu-name">Nama</Label>
            <Input
              id="cu-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cu-phone">WhatsApp</Label>
            <Input
              id="cu-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {editing ? "Simpan perubahan" : "Buat akun pelanggan"}
          </Button>
        </form>
      </Modal>
    </PageTransition>
    </RequirePermission>
  );
}
