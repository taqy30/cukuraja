export type CustomerKeyType = 'user' | 'guest'

export interface ParsedCustomerKey {
  type: CustomerKeyType
  userId?: string
  name?: string
  phone?: string
}

export function buildCustomerKey(
  customerUserId: string | null | undefined,
  name: string,
  phone: string
): string {
  if (customerUserId) return `user:${customerUserId}`
  return `guest:${encodeURIComponent(name)}|${encodeURIComponent(phone)}`
}

export function parseCustomerKey(key: string): ParsedCustomerKey | null {
  if (key.startsWith('user:')) {
    const userId = key.slice(5)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return null
    }
    return { type: 'user', userId }
  }
  if (key.startsWith('guest:')) {
    const rest = key.slice(6)
    const sep = rest.indexOf('|')
    if (sep === -1) return null
    let name = ''
    let phone = ''
    try {
      name = decodeURIComponent(rest.slice(0, sep)).normalize('NFKC').trim().slice(0, 80)
      phone = decodeURIComponent(rest.slice(sep + 1)).replace(/[^\d+]/g, '').slice(0, 20)
    } catch {
      return null
    }
    if (!name || name.length > 80) return null
    return { type: 'guest', name, phone }
  }
  return null
}
