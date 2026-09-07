import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authErrorResponse,
  canAccessBusiness,
  requirePermission,
} from '@/lib/auth/guards'
import { can } from '@/lib/auth/roles'
import { normalizeTime } from '@/lib/datetime'
import { getActiveCapsters } from '@/lib/booking/capster'
import { buildCapsterDaySlots } from '@/lib/booking/slots'
import { isDateISO, isTimeHM, isUuid, sanitizeText } from '@/lib/validation/input'
import { guardApiRequest } from '@/lib/security/http'

/**
 * Kelola blokir jadwal capster (berhalangan).
 *
 * Siapa boleh mengubah (logika terbaik):
 * - Kasir & Admin : utama untuk operasional harian / walk-in
 * - Capster       : hanya slot miliknya sendiri
 * - Owner         : semua
 */
export async function GET(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, {
      key: 'capster-blocks-list',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requirePermission(supabase, 'schedule.block')
    if (!ctx.businessId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const date = request.nextUrl.searchParams.get('date')
    const capsterId = request.nextUrl.searchParams.get('capster_id')
    if (!date || !capsterId || !isDateISO(date) || !isUuid(capsterId)) {
      return NextResponse.json({ error: 'date dan capster_id wajib / tidak valid' }, { status: 400 })
    }

    if (ctx.role === 'capster' && ctx.staffId !== capsterId) {
      return NextResponse.json({ error: 'Hanya jadwal Anda sendiri' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: business } = await admin
      .from('businesses')
      .select('open_time, close_time')
      .eq('id', ctx.businessId)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Bisnis tidak ditemukan' }, { status: 404 })
    }

    const slots = await buildCapsterDaySlots(
      admin,
      ctx.businessId,
      capsterId,
      date,
      String(business.open_time),
      String(business.close_time)
    )

    return NextResponse.json({
      date,
      capster_id: capsterId,
      slots,
      canManage:
        can(ctx.role, 'schedule.block') &&
        (ctx.role !== 'capster' || ctx.staffId === capsterId),
    })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Gagal memuat jadwal' }, { status: 500 })
  }
}

/** Tutup slot (berhalangan). */
export async function POST(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, { key: 'capster-block-create', limit: 40 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requirePermission(supabase, 'schedule.block')
    if (!ctx.businessId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const capsterId = body.capster_id as string
    const blockDate = body.block_date as string
    const blockTimeRaw = String(body.block_time ?? '')
    const reason = sanitizeText(body.reason, 120) || 'Berhalangan'

    if (!isUuid(capsterId) || !isDateISO(blockDate) || !isTimeHM(blockTimeRaw)) {
      return NextResponse.json({ error: 'Data blokir tidak lengkap atau tidak valid' }, { status: 400 })
    }
    const blockTime = normalizeTime(blockTimeRaw)

    if (ctx.role === 'capster' && ctx.staffId !== capsterId) {
      return NextResponse.json({ error: 'Hanya bisa blokir jadwal Anda sendiri' }, { status: 403 })
    }

    const admin = createAdminClient()
    const capsters = await getActiveCapsters(admin, ctx.businessId)
    if (!capsters.some((c) => c.id === capsterId)) {
      return NextResponse.json({ error: 'Capster tidak valid' }, { status: 400 })
    }

    // Jangan blokir jam yang sudah ada booking aktif
    const { data: existing } = await admin
      .from('bookings')
      .select('id')
      .eq('business_id', ctx.businessId)
      .eq('assigned_capster_id', capsterId)
      .eq('booking_date', blockDate)
      .eq('booking_time', blockTime)
      .not('status', 'in', '("cancelled","skipped")')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Jam sudah ada booking. Batalkan booking dulu jika perlu.' },
        { status: 409 }
      )
    }

    const { data, error } = await admin
      .from('capster_blocks')
      .upsert(
        {
          business_id: ctx.businessId,
          capster_id: capsterId,
          block_date: blockDate,
          block_time: blockTime,
          reason,
          created_by: ctx.userId,
        },
        { onConflict: 'capster_id,block_date,block_time' }
      )
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Gagal menutup slot' }, { status: 500 })
    }

    return NextResponse.json({ block: data }, { status: 201 })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

/** Buka kembali slot yang ditutup. */
export async function DELETE(request: NextRequest) {
  try {
    const blocked = await guardApiRequest(request, { key: 'capster-block-delete', limit: 40 })
    if (blocked) return blocked

    const supabase = await createClient()
    const ctx = await requirePermission(supabase, 'schedule.block')
    if (!ctx.businessId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const capsterId = searchParams.get('capster_id')
    const blockDate = searchParams.get('block_date')
    const blockTime = searchParams.get('block_time')
      ? normalizeTime(searchParams.get('block_time')!)
      : null

    if (!capsterId || !isUuid(capsterId) || !blockDate || !isDateISO(blockDate) || !blockTime || !isTimeHM(blockTime)) {
      return NextResponse.json({ error: 'Parameter tidak lengkap atau tidak valid' }, { status: 400 })
    }

    if (ctx.role === 'capster' && ctx.staffId !== capsterId) {
      return NextResponse.json({ error: 'Hanya jadwal Anda sendiri' }, { status: 403 })
    }

    if (!canAccessBusiness(ctx, ctx.businessId)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('capster_blocks')
      .delete()
      .eq('business_id', ctx.businessId)
      .eq('capster_id', capsterId)
      .eq('block_date', blockDate)
      .eq('block_time', blockTime)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Gagal membuka slot' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const res = authErrorResponse(e)
    if (res) return res
    console.error(e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
