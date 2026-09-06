import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/guards'
import { homeFor } from '@/lib/auth/roles'

/** Booking online khusus akun pelanggan; role bisnis dialihkan ke dashboardnya. */
export default async function BookingAuthLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const ctx = await getAuthContext(supabase)

  if (!ctx) {
    redirect(`/login?redirect=${encodeURIComponent(`/${slug}/booking`)}`)
  }

  if (ctx.role !== 'customer') {
    redirect(homeFor(ctx.role))
  }

  return <>{children}</>
}
