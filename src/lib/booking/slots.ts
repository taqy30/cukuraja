import type { SupabaseClient } from '@supabase/supabase-js'
import {
  dateInJakarta,
  minutesNowInJakarta,
  minutesToTime,
  normalizeTime,
  timeToMinutes,
} from '@/lib/datetime'

/** Satu kursi capster = 1 jam (10:00, 11:00, 12:00, ...). */
export const SLOT_INTERVAL_MINUTES = 60

const ACTIVE_EXCLUDE = '("cancelled","skipped")'

export function generateHourlySlots(openTime: string, closeTime: string): string[] {
  const open = timeToMinutes(normalizeTime(openTime))
  const close = timeToMinutes(normalizeTime(closeTime))
  let cursor = open % SLOT_INTERVAL_MINUTES === 0
    ? open
    : open + (SLOT_INTERVAL_MINUTES - (open % SLOT_INTERVAL_MINUTES))

  const slots: string[] = []
  while (cursor + SLOT_INTERVAL_MINUTES <= close) {
    slots.push(minutesToTime(cursor))
    cursor += SLOT_INTERVAL_MINUTES
  }
  return slots
}

/** Snap jam sekarang ke slot jam penuh terdekat yang belum lewat (atau slot berikutnya). */
export function suggestWalkInSlot(openTime: string, closeTime: string): string | null {
  const slots = generateHourlySlots(openTime, closeTime)
  const now = minutesNowInJakarta()
  return slots.find((t) => timeToMinutes(t) + SLOT_INTERVAL_MINUTES > now) ?? null
}

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'past'

export interface CapsterSlot {
  time: string
  status: SlotStatus
  available: boolean
  booking_code?: string | null
  customer_name?: string | null
  reason?: string | null
}

export async function getBlockedTimes(
  supabase: SupabaseClient,
  businessId: string,
  capsterId: string,
  date: string
): Promise<Map<string, string | null>> {
  const { data } = await supabase
    .from('capster_blocks')
    .select('block_time, reason')
    .eq('business_id', businessId)
    .eq('capster_id', capsterId)
    .eq('block_date', date)

  const map = new Map<string, string | null>()
  for (const row of data ?? []) {
    map.set(normalizeTime(String(row.block_time)), row.reason ?? null)
  }
  return map
}

export async function getBookedHourSlots(
  supabase: SupabaseClient,
  businessId: string,
  capsterId: string,
  date: string
): Promise<Map<string, { code: string; customer_name: string }>> {
  const { data } = await supabase
    .from('bookings')
    .select('booking_time, booking_code, customer_name')
    .eq('business_id', businessId)
    .eq('assigned_capster_id', capsterId)
    .eq('booking_date', date)
    .not('status', 'in', ACTIVE_EXCLUDE)

  const map = new Map<string, { code: string; customer_name: string }>()
  for (const row of data ?? []) {
    // Snap ke jam penuh: 10:30 → dianggap bentrok slot 10:00
    const minutes = timeToMinutes(normalizeTime(String(row.booking_time)))
    const hourSlot = minutesToTime(Math.floor(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES)
    map.set(hourSlot, {
      code: row.booking_code,
      customer_name: row.customer_name,
    })
  }
  return map
}

export async function buildCapsterDaySlots(
  supabase: SupabaseClient,
  businessId: string,
  capsterId: string,
  date: string,
  openTime: string,
  closeTime: string
): Promise<CapsterSlot[]> {
  const hours = generateHourlySlots(openTime, closeTime)
  const [blocked, booked] = await Promise.all([
    getBlockedTimes(supabase, businessId, capsterId, date),
    getBookedHourSlots(supabase, businessId, capsterId, date),
  ])

  const today = dateInJakarta()
  const nowMinutes = minutesNowInJakarta()

  return hours.map((time) => {
    const start = timeToMinutes(time)
    const isPast = date === today && start + SLOT_INTERVAL_MINUTES <= nowMinutes
    const blockReason = blocked.get(time)
    const booking = booked.get(time)

    if (isPast) {
      return { time, status: 'past', available: false }
    }
    if (blockReason !== undefined) {
      return {
        time,
        status: 'blocked',
        available: false,
        reason: blockReason,
      }
    }
    if (booking) {
      return {
        time,
        status: 'booked',
        available: false,
        booking_code: booking.code,
        customer_name: booking.customer_name,
      }
    }
    return { time, status: 'available', available: true }
  })
}

/** Cek apakah jam penuh ini masih bisa di-booking untuk capster. */
export async function isHourlySlotFree(
  supabase: SupabaseClient,
  businessId: string,
  capsterId: string,
  date: string,
  time: string
): Promise<{ free: boolean; reason?: string }> {
  const timeNorm = normalizeTime(time)
  const minutes = timeToMinutes(timeNorm)

  // Harus tepat di jam penuh
  if (minutes % SLOT_INTERVAL_MINUTES !== 0) {
    return { free: false, reason: 'Jam harus genap per jam (contoh 10:00, 11:00)' }
  }

  const today = dateInJakarta()
  if (date === today && minutes + SLOT_INTERVAL_MINUTES <= minutesNowInJakarta()) {
    return { free: false, reason: 'Jam sudah lewat' }
  }

  const blocked = await getBlockedTimes(supabase, businessId, capsterId, date)
  if (blocked.has(timeNorm)) {
    return { free: false, reason: 'Capster berhalangan di jam tersebut' }
  }

  const booked = await getBookedHourSlots(supabase, businessId, capsterId, date)
  if (booked.has(timeNorm)) {
    return { free: false, reason: 'Jam tersebut sudah terisi booking' }
  }

  return { free: true }
}
