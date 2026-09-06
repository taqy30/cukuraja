"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import { RoleBadge } from "@/components/ui/role-badge";
import { SkeletonList } from "@/components/ui/skeleton";
import { FormError, Modal } from "@/components/ui/modal";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { RequirePermission } from "@/components/RequirePermission";
import { ROLE_DESCRIPTION, STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";
import { askConfirm } from "@/components/feedback/ConfirmHost";
import { notify } from "@/lib/notify";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: "active" | "inactive";
  created_at: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "kasir" as StaffRole,
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPageError(null);
    const res = await fetch("/api/staff");
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPageError(data.error ?? "Gagal memuat tim");
      setLoading(false);
      return;
    }

    setStaff(data.staff ?? []);
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

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({ name: member.name, email: member.email, password: "", role: member.role });
    setError(null);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(editing ? `/api/staff/${editing.id}` : "/api/staff", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing
          ? { name: form.name, role: form.role }
          : {
              name: form.name,
              email: form.email,
              password: form.password,
              role: form.role,
            }
      ),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan anggota tim");
      return;
    }

    setModalOpen(false);
    await load();
  };

  const toggleStatus = async (member: StaffMember) => {
    const nextStatus = member.status === "active" ? "inactive" : "active";
    const activating = nextStatus === "active";

    const ok = await askConfirm({
      title: activating ? `Aktifkan akun ${member.name}?` : `Nonaktifkan akun ${member.name}?`,
      description: activating
        ? "Akun ini akan dapat masuk kembali ke dashboard sesuai perannya."
        : "Akun ini tidak akan dapat masuk hingga diaktifkan kembali.",
      confirmLabel: activating ? "Aktifkan" : "Nonaktifkan",
      danger: !activating,
    });
    if (!ok) return;

    const res = await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Gagal mengubah status";
      setPageError(message);
      notify.error(message);
      return;
    }
    notify.success(
      activating ? "Akun berhasil diaktifkan" : "Akun berhasil dinonaktifkan"
    );
    await load();
  };

  return (
    <RequirePermission permission="staff.read">
    <PageTransition className="space-y-6">
      <PageHeader
        title="Tim & Akun"
        description={
          canManage
            ? "Buat akun admin, kasir, dan capster. Setiap role punya batas akses yang berbeda."
            : "Daftar tim barbershop. Hanya owner yang bisa membuat atau mengubah akun."
        }
        actions={
          canManage && (
            <Button type="button" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Tambah anggota
            </Button>
          )
        }
      />

      <FormError message={pageError} />

      <SpotlightCard className="p-5" interactive={false}>
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Batas akses per role
        </h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {STAFF_ROLES.map((role) => (
            <li key={role} className="flex items-start gap-2.5">
              <RoleBadge role={role} className="shrink-0" />
              <span className="text-sm text-muted-foreground">{ROLE_DESCRIPTION[role]}</span>
            </li>
          ))}
        </ul>
      </SpotlightCard>

      {loading ? (
        <SkeletonList count={3} />
      ) : staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada anggota tim"
          description="Tambahkan kasir untuk mengelola walk-in dan capster agar pelanggan bisa memilih barber."
          action={
            canManage && (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Tambah anggota
              </Button>
            )
          }
        />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {staff.map((member) => (
            <StaggerItem key={member.id}>
              <SpotlightCard className="flex h-full flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-base font-semibold text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RoleBadge role={member.role} />
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor:
                        member.status === "active"
                          ? "var(--status-completed-bg)"
                          : "var(--status-cancelled-bg)",
                      color:
                        member.status === "active"
                          ? "var(--status-completed)"
                          : "var(--status-cancelled)",
                    }}
                  >
                    {member.status === "active" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                {canManage && (
                  <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(member)}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleStatus(member)}
                      className={
                        member.status === "active"
                          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                          : ""
                      }
                    >
                      <UserMinus className="mr-1.5 h-4 w-4" aria-hidden />
                      {member.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                )}
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Ubah Anggota Tim" : "Tambah Anggota Tim"}
        description={
          editing
            ? "Email tidak bisa diubah. Perubahan role langsung mengubah menu yang mereka lihat."
            : "Akun langsung aktif dan bisa dipakai login."
        }
      >
        <form onSubmit={save} className="space-y-4">
          <FormError message={error} />

          <div className="space-y-2">
            <Label htmlFor="st-name">Nama</Label>
            <Input
              id="st-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {!editing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="st-email">Email login</Label>
                <Input
                  id="st-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-password">Password</Label>
                <Input
                  id="st-password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Role</legend>
            <div className="space-y-2">
              {STAFF_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors duration-200 hover:border-primary/40 has-checked:border-primary has-checked:bg-secondary"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={form.role === role}
                    onChange={() => setForm({ ...form, role })}
                    className="mt-1 accent-primary"
                  />
                  <span className="min-w-0">
                    <RoleBadge role={role} />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {ROLE_DESCRIPTION[role]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {editing ? "Simpan perubahan" : "Buat akun"}
          </Button>
        </form>
      </Modal>
    </PageTransition>
    </RequirePermission>
  );
}
