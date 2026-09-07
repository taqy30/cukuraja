-- Cukuraja — RLS bookings: batasi SELECT/UPDATE client
-- Capster hanya melihat booking assigned; mutasi status hanya lewat API (service role).

-- ===== SELECT: pisahkan ops vs capster =====
drop policy if exists "Staff and owners can view bookings" on bookings;

create policy "Owners and ops can view bookings" on bookings
  for select using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff
      where user_id = auth.uid()
        and status = 'active'
        and role in ('admin', 'kasir')
    )
  );

create policy "Capsters can view assigned bookings" on bookings
  for select using (
    assigned_capster_id in (
      select id from staff
      where user_id = auth.uid()
        and status = 'active'
        and role = 'capster'
    )
  );

-- ===== UPDATE: nonaktifkan dari client JWT =====
-- Semua perubahan status/detail wajib lewat Next.js API + service role
-- agar state machine + audit log tidak bisa dilewati.
drop policy if exists "Owners and ops can update bookings" on bookings;
drop policy if exists "Capsters can update assigned bookings" on bookings;
