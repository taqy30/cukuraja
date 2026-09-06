import { NextResponse } from 'next/server'

/**
 * Legacy endpoint. Registrasi dipisah:
 * - Pelanggan: Supabase Auth di `/register`
 * - Owner + bisnis: `POST /api/register/business`
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Gunakan /register untuk pelanggan atau POST /api/register/business untuk owner',
    },
    { status: 410 }
  )
}
