-- AntriKu — hardening RLS lanjutan
-- 1) Hapus policy FOR ALL legacy yang bypass permission app
-- 2) Matikan INSERT booking dari client (wajib lewat API + service role)
-- 3) UPDATE booking scoped: ops vs capster assigned
-- 4) Tutup public SELECT capster_blocks (slots pakai service role)
-- 5) Matikan INSERT booking_logs dari client

-- ===== BOOKINGS =====
drop policy if exists "Staff and owners can manage bookings" on bookings;

-- Semua create booking lewat Next.js API (service role) agar rate limit + validasi slot berlaku.
drop policy if exists "Customers can create own bookings" on bookings;
drop policy if exists "Staff and owners can create bookings" on bookings;
drop policy if exists "Anyone can create bookings" on bookings;

-- UPDATE: owner / admin / kasir di bisnisnya
drop policy if exists "Owners and ops can update bookings" on bookings;
create policy "Owners and ops can update bookings" on bookings
  for update using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff
      where user_id = auth.uid()
        and status = 'active'
        and role in ('admin', 'kasir')
    )
  )
  with check (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff
      where user_id = auth.uid()
        and status = 'active'
        and role in ('admin', 'kasir')
    )
  );

-- UPDATE: capster hanya booking yang di-assign ke dirinya
drop policy if exists "Capsters can update assigned bookings" on bookings;
create policy "Capsters can update assigned bookings" on bookings
  for update using (
    assigned_capster_id in (
      select id from staff
      where user_id = auth.uid() and status = 'active' and role = 'capster'
    )
  )
  with check (
    assigned_capster_id in (
      select id from staff
      where user_id = auth.uid() and status = 'active' and role = 'capster'
    )
  );

-- ===== BOOKING LOGS =====
drop policy if exists "System can insert logs" on booking_logs;
drop policy if exists "Authenticated can insert accessible booking logs" on booking_logs;
-- Insert logs hanya via service role (API).

-- ===== CAPSTER BLOCKS =====
drop policy if exists "Public can view blocks" on capster_blocks;
-- Tetap: staff/owner bisa lihat (policy existing). Public slot via API service role.
