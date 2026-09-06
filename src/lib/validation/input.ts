/** Validasi & sanitasi input API (defense-in-depth). */

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'admin123',
  'welcome1',
  'letmein1',
  'owner123',
  'staff123',
  'user1234',
])

export function sanitizeText(input: unknown, maxLength = 200): string {
  if (typeof input !== 'string') return ''
  return input.normalize('NFKC').replace(CONTROL_CHARS, '').trim().slice(0, maxLength)
}

export function sanitizeNote(input: unknown): string | null {
  const text = sanitizeText(input, 500)
  return text || null
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

/** Tanggal kalender `YYYY-MM-DD` (tanpa zona). */
export function isDateISO(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/** Jam `HH:MM` atau `HH:MM:SS`. */
export function isTimeHM(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)
}

export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** WhatsApp / telepon Indonesia longgar: 8–16 digit (boleh awalan +). */
export function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') return ''
  const cleaned = input.replace(/[^\d+]/g, '').slice(0, 20)
  return cleaned
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 16
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return '****'
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`
}

/**
 * Password: min length, max length, bukan password umum,
 * wajib huruf + angka (untuk akun baru).
 */
export function assertMinPassword(password: unknown, min = 8): string | null {
  if (typeof password !== 'string' || password.length < min) {
    return `Password minimal ${min} karakter`
  }
  if (password.length > 128) return 'Password terlalu panjang'
  if (/\s/.test(password)) return 'Password tidak boleh mengandung spasi'
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Password terlalu umum. Gunakan kombinasi yang lebih kuat.'
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password harus mengandung huruf dan angka'
  }
  return null
}

/** Slug URL publik: huruf kecil, angka, strip. 2–48 karakter. */
export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 2 &&
    value.length <= 48 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  )
}

export function slugify(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

/** Booking code format (huruf/angka/strip, panjang terbatas). */
export function isBookingCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9-]{6,32}$/i.test(value.trim())
}
