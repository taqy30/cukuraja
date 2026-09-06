import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateInJakarta } from '@/lib/datetime'

/** Kode unik sulit ditebak: B-YYMMDD-A1B2C3 / W-YYMMDD-A1B2C3 */
export async function nextBookingCode(
  admin: ReturnType<typeof createAdminClient>,
  _businessId: string,
  source: 'online' | 'walk_in'
) {
  const today = dateInJakarta()
  const prefix = source === 'walk_in' ? 'W' : 'B'
  const dayTag = today.replace(/-/g, '').slice(2)

  for (let attempt = 0; attempt < 8; attempt++) {
    const token = randomBytes(3).toString('hex').toUpperCase()
    const code = `${prefix}-${dayTag}-${token}`

    const { data } = await admin
      .from('bookings')
      .select('id')
      .eq('booking_code', code)
      .maybeSingle()

    if (!data) return code
  }

  // Fallback sangat jarang: tambah timestamp
  return `${prefix}-${dayTag}-${Date.now().toString(36).toUpperCase()}`
}
