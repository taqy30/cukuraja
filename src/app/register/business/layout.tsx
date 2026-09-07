import { notFound } from 'next/navigation'
import { isBusinessRegisterEnabled } from '@/lib/security/flags'

/** Tutup halaman setup bisnis di production kecuali ENABLE_BUSINESS_REGISTER=true. */
export default function RegisterBusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isBusinessRegisterEnabled()) notFound()
  return children
}
