import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardApiRequest } from '@/lib/security/http'
import { isValidSlug, sanitizeText } from '@/lib/validation/input'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const blocked = guardApiRequest(request, {
      key: 'business-public',
      limit: 60,
      requireSameOrigin: false,
    })
    if (blocked) return blocked

    const { slug: raw } = await params
    const slug = sanitizeText(raw, 48).toLowerCase()
    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, slug, open_time, close_time, active_barbers')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: 'Barbershop tidak ditemukan' }, { status: 404 })
    }

    const { data: services } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price_start, description')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .order('price_start', { ascending: true })

    const { data: capsters } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .eq('role', 'capster')
      .order('name')

    return NextResponse.json({
      business,
      services: services || [],
      capsters: capsters || [],
    })
  } catch (error) {
    console.error('Business lookup error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
