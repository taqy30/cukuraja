import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { guardApiRequest } from '@/lib/security/http'
import {
  isTimeHM,
  isValidPhone,
  sanitizePhone,
  sanitizeText,
} from '@/lib/validation/input'

export async function GET(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'settings-get',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'settings.manage')

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('businesses')
      .select('id, name, slug, address, phone, open_time, close_time, active_barbers')
      .eq('id', ctx.businessId)
      .single()

    if (error) throw error
    return NextResponse.json({ business: data })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal memuat pengaturan' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const blocked = guardApiRequest(request, { key: 'settings-patch', limit: 20 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'settings.manage')

    const body = await request.json().catch(() => ({}))
    const name = sanitizeText(body.name, 80)
    const address = sanitizeText(body.address, 200) || null
    const phoneRaw = sanitizePhone(body.phone)
    const phone = phoneRaw || null
    const open = String(body.open_time ?? '').slice(0, 5)
    const close = String(body.close_time ?? '').slice(0, 5)

    if (!name) {
      return NextResponse.json({ error: 'Nama barbershop wajib diisi' }, { status: 400 })
    }

    if (!isTimeHM(open) || !isTimeHM(close)) {
      return NextResponse.json({ error: 'Format jam harus HH:MM' }, { status: 400 })
    }

    if (open >= close) {
      return NextResponse.json(
        { error: 'Jam tutup harus lebih malam dari jam buka' },
        { status: 400 }
      )
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Nomor telepon tidak valid' }, { status: 400 })
    }

    const barbers = Number(body.active_barbers)
    if (!Number.isInteger(barbers) || barbers < 1 || barbers > 50) {
      return NextResponse.json(
        { error: 'Jumlah barber aktif harus antara 1-50' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('businesses')
      .update({
        name,
        address,
        phone,
        open_time: open,
        close_time: close,
        active_barbers: barbers,
      })
      .eq('id', ctx.businessId)
      .select('id, name, slug, address, phone, open_time, close_time, active_barbers')
      .single()

    if (error) throw error
    return NextResponse.json({ business: data })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 })
  }
}
