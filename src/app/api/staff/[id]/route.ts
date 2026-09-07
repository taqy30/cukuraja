import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { STAFF_ROLES, type StaffRole } from '@/lib/auth/roles'
import { guardApiRequest } from '@/lib/security/http'
import { isUuid, sanitizeText } from '@/lib/validation/input'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await guardApiRequest(request, { key: 'staff-patch', limit: 30 })
    if (blocked) return blocked

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'staff.manage')

    const body = await request.json().catch(() => ({}))
    const name = body.name != null ? sanitizeText(body.name, 80) : null
    const role = body.role
    const status = body.status

    const admin = createAdminClient()
    const { data: current } = await admin
      .from('staff')
      .select('id, user_id')
      .eq('id', id)
      .eq('business_id', ctx.businessId)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: 'Anggota tim tidak ditemukan' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (name != null) {
      if (!name) {
        return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
      }
      updates.name = name
    }
    if (role != null) {
      if (!STAFF_ROLES.includes(role as StaffRole)) {
        return NextResponse.json(
          { error: 'Role harus admin, kasir, atau capster' },
          { status: 400 }
        )
      }
      updates.role = role
    }
    if (status != null) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
      }
      updates.status = status
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
    }

    const { data: staff, error } = await admin
      .from('staff')
      .update(updates)
      .eq('id', id)
      .eq('business_id', ctx.businessId)
      .select('id, name, role, status, created_at, user_id')
      .single()

    if (error) throw error

    if (updates.name || updates.role) {
      const { data: userData } = await admin.auth.admin.getUserById(current.user_id)
      if (userData?.user) {
        await admin.auth.admin.updateUserById(current.user_id, {
          user_metadata: {
            ...userData.user.user_metadata,
            ...(updates.name ? { full_name: updates.name } : {}),
            ...(updates.role ? { role: updates.role } : {}),
          },
        })
      }
    }

    return NextResponse.json({ staff })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal mengubah anggota tim' }, { status: 500 })
  }
}

/** Nonaktifkan anggota tim (soft delete) agar riwayat booking tetap utuh. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await guardApiRequest(request, { key: 'staff-delete', limit: 20 })
    if (blocked) return blocked

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'staff.manage')

    const admin = createAdminClient()
    const { error } = await admin
      .from('staff')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('business_id', ctx.businessId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal menonaktifkan anggota tim' }, { status: 500 })
  }
}
