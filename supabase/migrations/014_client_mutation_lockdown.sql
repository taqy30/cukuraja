-- Cukuraja — matikan mutasi booking dari client JWT
-- CREATE/UPDATE sudah dikunci (012/013). DELETE juga wajib lewat API + service role
-- agar audit + rate limit + permission app tidak bisa dilewati lewat PostgREST langsung.

drop policy if exists "Owners can delete bookings" on bookings;
drop policy if exists "Admins can delete bookings" on bookings;
drop policy if exists "Managers can delete bookings in their business" on bookings;
drop policy if exists "Kasir can delete bookings in their business" on bookings;

-- Pastikan tidak ada sisa UPDATE policy dari 012 (sudah di-drop 013; idempotent).
drop policy if exists "Owners and ops can update bookings" on bookings;
drop policy if exists "Capsters can update assigned bookings" on bookings;
