import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { STAFF_ROLES, type StaffRole } from '@/lib/auth/roles'
import {
  assertMinPassword,
  isEmail,
  maskEmail,
  sanitizeText,
} from '@/lib/validation/input'
import { allowUnverifiedSignup } from '@/lib/security/flags'
import { guardApiRequest } from '@/lib/security/http'

/** Daftar tim. Bisa dibaca owner, admin, dan kasir (`staff.read`). */
export async function GET(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, {
      key: 'staff-list',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'staff.read')

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('staff')
      .select('id, name, role, status, created_at, user_id')
      .eq('business_id', ctx.businessId)
      .order('role')
      .order('name')

    if (error) throw error

    const staff = await Promise.all(
      (data ?? []).map(async (row) => {
        let email = ''
        try {
          const { data: userData } = await admin.auth.admin.getUserById(row.user_id)
          email = userData?.user?.email ?? ''
        } catch {
          email = ''
        }
        // Hanya owner melihat email penuh; admin/kasir dapat versi ter-mask.
        const safeEmail =
          ctx.role === 'owner' ? email : email ? maskEmail(email) : ''
        return { ...row, email: safeEmail }
      })
    )

    return NextResponse.json({ staff, canManage: ctx.role === 'owner' })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal memuat tim' }, { status: 500 })
  }
}

/** Buat akun tim baru. Hanya owner (`staff.manage`). */
export async function POST(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, { key: 'staff-create', limit: 10 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'staff.manage')

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = sanitizeText(body.name, 80)
    const role = body.role
    const password = body.password

    if (!isEmail(email) || !name || !role || !password) {
      return NextResponse.json(
        { error: 'Email, password, nama, dan role wajib diisi' },
        { status: 400 }
      )
    }

    if (!STAFF_ROLES.includes(role as StaffRole)) {
      return NextResponse.json(
        { error: 'Role harus admin, kasir, atau capster' },
        { status: 400 }
      )
    }

    const pwdError = assertMinPassword(password, 8)
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: allowUnverifiedSignup(),
      user_metadata: { full_name: name, role },
    })

    if (authError) {
      return NextResponse.json(
        { error: 'Gagal membuat akun. Periksa data atau coba email lain.' },
        { status: 400 }
      )
    }

    const { data: staff, error: staffError } = await admin
      .from('staff')
      .insert({
        user_id: authData.user.id,
        business_id: ctx.businessId,
        name,
        role,
        status: 'active',
      })
      .select('id, name, role, status, created_at, user_id')
      .single()

    if (staffError) {
      // Rollback akun auth agar tidak ada user menggantung tanpa baris staff.
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Gagal menyimpan data staf' }, { status: 500 })
    }

    return NextResponse.json({ staff: { ...staff, email } }, { status: 201 })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal menambah anggota tim' }, { status: 500 })
  }
}
