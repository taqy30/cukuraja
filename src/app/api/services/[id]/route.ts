import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorResponse, requireBusinessPermission } from '@/lib/auth/guards'
import { guardApiRequest } from '@/lib/security/http'
import { isUuid, sanitizeText } from '@/lib/validation/input'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = guardApiRequest(request, { key: 'service-patch', limit: 30 })
    if (blocked) return blocked

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'service.manage')

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    if (body.name != null) {
      const name = sanitizeText(body.name, 80)
      if (!name) {
        return NextResponse.json({ error: 'Nama layanan wajib diisi' }, { status: 400 })
      }
      updates.name = name
    }
    if (body.description !== undefined) {
      updates.description = sanitizeText(body.description, 300) || null
    }
    if (body.duration_minutes != null) {
      const duration = Number(body.duration_minutes)
      if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
        return NextResponse.json({ error: 'Durasi harus antara 5-480 menit' }, { status: 400 })
      }
      updates.duration_minutes = duration
    }
    if (body.price_start !== undefined) {
      const price =
        body.price_start != null && body.price_start !== '' ? Number(body.price_start) : null
      if (price != null && (!Number.isFinite(price) || price < 0 || price > 100_000_000)) {
        return NextResponse.json({ error: 'Harga tidak valid' }, { status: 400 })
      }
      updates.price_start = price
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('services')
      .update(updates)
      .eq('id', id)
      .eq('business_id', ctx.businessId)
      .select('id, name, description, duration_minutes, price_start, status')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ service: data })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal mengubah layanan' }, { status: 500 })
  }
}

/** Arsipkan layanan agar booking lama yang memakainya tetap valid. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = guardApiRequest(request, { key: 'service-delete', limit: 20 })
    if (blocked) return blocked

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    const supabase = await createClient()
    const ctx = await requireBusinessPermission(supabase, 'service.manage')

    const admin = createAdminClient()
    const { error } = await admin
      .from('services')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('business_id', ctx.businessId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    return NextResponse.json({ error: 'Gagal menghapus layanan' }, { status: 500 })
  }
}
