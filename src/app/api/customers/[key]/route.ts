import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { parseCustomerKey } from '@/lib/customers/keys'
import {
  isValidPhone,
  sanitizePhone,
  sanitizeText,
} from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

async function customerBelongsToBusiness(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  parsed: NonNullable<ReturnType<typeof parseCustomerKey>>
): Promise<boolean> {
  if (parsed.type === 'user' && parsed.userId) {
    const [{ count }, { data: member }] = await Promise.all([
      admin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('customer_user_id', parsed.userId),
      admin
        .from('business_customers')
        .select('user_id')
        .eq('business_id', businessId)
        .eq('user_id', parsed.userId)
        .maybeSingle(),
    ])
    return (count ?? 0) > 0 || !!member
  }

  if (parsed.type === 'guest' && parsed.name && parsed.phone) {
    const { count } = await admin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('customer_name', parsed.name)
      .eq('customer_phone', parsed.phone)
      .is('customer_user_id', null)
    return (count ?? 0) > 0
  }

  return false
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const blocked = guardApiRequest(request, { key: 'customer-patch', limit: 20 })
    if (blocked) return blocked

    const { key: rawKey } = await params
    const parsed = parseCustomerKey(decodeURIComponent(rawKey))
    if (!parsed) {
      return NextResponse.json({ error: 'Pelanggan tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'customer.manage')
    const admin = createAdminClient()

    const belongs = await customerBelongsToBusiness(admin, ctx.businessId, parsed)
    if (!belongs) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan di barbershop ini' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const nextName = sanitizeText(body.name, 80)
    const nextPhone = sanitizePhone(body.phone)

    if (!nextName || !isValidPhone(nextPhone)) {
      return NextResponse.json(
        { error: 'Nama dan nomor WhatsApp valid wajib diisi' },
        { status: 400 }
      )
    }

    if (parsed.type === 'user' && parsed.userId) {
      // Hanya update data di tenant ini — jangan mutate Auth metadata global (IDOR lintas bisnis).
      const { error } = await admin
        .from('bookings')
        .update({ customer_name: nextName, customer_phone: nextPhone })
        .eq('business_id', ctx.businessId)
        .eq('customer_user_id', parsed.userId)

      if (error) throw error

      await admin
        .from('business_customers')
        .upsert(
          {
            business_id: ctx.businessId,
            user_id: parsed.userId,
            name: nextName,
            phone: nextPhone,
          },
          { onConflict: 'business_id,user_id' }
        )
    } else if (parsed.type === 'guest' && parsed.name && parsed.phone) {
      const { error } = await admin
        .from('bookings')
        .update({ customer_name: nextName, customer_phone: nextPhone })
        .eq('business_id', ctx.businessId)
        .eq('customer_name', parsed.name)
        .eq('customer_phone', parsed.phone)
        .is('customer_user_id', null)

      if (error) throw error
    }

    return NextResponse.json({ ok: true, name: nextName, phone: nextPhone })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal mengubah pelanggan' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const blocked = guardApiRequest(request, { key: 'customer-delete', limit: 15 })
    if (blocked) return blocked

    const { key: rawKey } = await params
    const parsed = parseCustomerKey(decodeURIComponent(rawKey))
    if (!parsed) {
      return NextResponse.json({ error: 'Pelanggan tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'customer.manage')
    const admin = createAdminClient()

    const belongs = await customerBelongsToBusiness(admin, ctx.businessId, parsed)
    if (!belongs) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan di barbershop ini' }, { status: 404 })
    }

    if (parsed.type === 'user' && parsed.userId) {
      // Hanya hapus data di bisnis ini — jangan hapus akun Auth global (IDOR).
      const { error } = await admin
        .from('bookings')
        .delete()
        .eq('business_id', ctx.businessId)
        .eq('customer_user_id', parsed.userId)

      if (error) throw error

      await admin
        .from('business_customers')
        .delete()
        .eq('business_id', ctx.businessId)
        .eq('user_id', parsed.userId)
    } else if (parsed.type === 'guest' && parsed.name && parsed.phone) {
      const { error } = await admin
        .from('bookings')
        .delete()
        .eq('business_id', ctx.businessId)
        .eq('customer_name', parsed.name)
        .eq('customer_phone', parsed.phone)
        .is('customer_user_id', null)

      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal menghapus pelanggan' }, { status: 500 })
  }
}
