/** Util tanggal/waktu zona Asia/Jakarta untuk booking & slot. */

const TZ = 'Asia/Jakarta'

/** YYYY-MM-DD di zona Jakarta. */
export function dateInJakarta(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Menit sejak tengah malam di zona Jakarta. */
export function minutesNowInJakarta(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

/** Normalisasi "10:00:00" / "10:00" → "10:00". */
export function normalizeTime(value: string): string {
  const raw = String(value ?? '')
  // ISO datetime → ambil jam lokal string HH:MM jika ada T
  if (raw.includes('T')) {
    const match = raw.match(/T(\d{2}):(\d{2})/)
    if (match) return `${match[1]}:${match[2]}`
  }
  return raw.slice(0, 5)
}

export function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** YYYY-MM-DD lokal browser (untuk client components). */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
