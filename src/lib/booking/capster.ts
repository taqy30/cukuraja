import type { SupabaseClient } from '@supabase/supabase-js'
import { isHourlySlotFree } from '@/lib/booking/slots'

export async function getActiveCapsters(supabase: SupabaseClient, businessId: string) {
  const { data } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .eq('role', 'capster')
    .order('name')
  return data ?? []
}

export async function validateCapsterAssignment(
  supabase: SupabaseClient,
  businessId: string,
  capsterId: string | null | undefined
): Promise<
  | { ok: true; capsterId: string | null; hasCapsters: boolean }
  | { ok: false; error: string; status: number }
> {
  const capsters = await getActiveCapsters(supabase, businessId)
  const hasCapsters = capsters.length > 0

  if (!hasCapsters) {
    return { ok: true, capsterId: null, hasCapsters: false }
  }

  if (!capsterId) {
    return { ok: false, error: 'Pilih capster terlebih dahulu', status: 400 }
  }

  const valid = capsters.some((c) => c.id === capsterId)
  if (!valid) {
    return { ok: false, error: 'Capster tidak ditemukan atau tidak aktif', status: 400 }
  }

  return { ok: true, capsterId, hasCapsters: true }
}

/**
 * Slot 1 jam per capster: kosong, belum lewat, dan tidak ditandai berhalangan.
 */
export async function isCapsterSlotAvailable(
  supabase: SupabaseClient,
  businessId: string,
  capsterId: string,
  bookingDate: string,
  bookingTime: string,
  _serviceId?: string | null
): Promise<boolean> {
  const result = await isHourlySlotFree(
    supabase,
    businessId,
    capsterId,
    bookingDate,
    bookingTime
  )
  return result.free
}
