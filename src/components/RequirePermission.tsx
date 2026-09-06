"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { homeFor, type AppRole, type Permission } from "@/lib/auth/roles";

/**
 * Guard sisi klien: jika role tidak punya izin (dan opsional tidak termasuk
 * daftar role yang diizinkan), arahkan ke home role tersebut.
 * API tetap jadi sumber kebenaran — ini hanya mencegah UI kosong / membingungkan.
 */
export function RequirePermission({
  permission,
  roles,
  children,
}: {
  permission: Permission;
  /** Jika diisi, role harus termasuk salah satu nilai ini. */
  roles?: AppRole[];
  children: React.ReactNode;
}) {
  const { can, role, loading } = usePermissions();
  const router = useRouter();
  const allowed =
    !!role && can(permission) && (!roles || roles.includes(role));

  useEffect(() => {
    if (loading || !role) return;
    if (!allowed) router.replace(homeFor(role));
  }, [loading, role, allowed, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (!role || !allowed) return null;
  return <>{children}</>;
}
