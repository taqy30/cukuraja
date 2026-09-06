"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppRole, Permission } from "@/lib/auth/roles";

interface PermissionState {
  role: AppRole | null;
  permissions: Permission[];
  businessId: string | null;
  staffId: string | null;
  loading: boolean;
}

/**
 * Mengambil role + daftar izin dari server sekali per halaman.
 * UI memakai ini untuk menyembunyikan aksi yang tetap akan ditolak API,
 * sehingga menu dan izin tidak pernah berbeda.
 */
export function usePermissions(): PermissionState & {
  can: (permission: Permission) => boolean;
} {
  const [state, setState] = useState<PermissionState>({
    role: null,
    permissions: [],
    businessId: null,
    staffId: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) {
          if (active) setState((s) => ({ ...s, loading: false }));
          return;
        }
        setState({
          role: data.role,
          permissions: data.permissions ?? [],
          businessId: data.businessId ?? null,
          staffId: data.staffId ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (active) setState((s) => ({ ...s, loading: false }));
      });

    return () => {
      active = false;
    };
  }, []);

  const can = useCallback(
    (permission: Permission) => state.permissions.includes(permission),
    [state.permissions]
  );

  return { ...state, can };
}
