-- AntriKu — perketat RLS bookings & booking_logs
-- Menghapus policy terbuka (select/insert true) yang membocorkan PII via anon key.

-- 1) Hapus policy berbahaya dari schema awal
drop policy if exists "Anyone can create bookings" on bookings;
drop policy if exists "Public can view own booking by code" on bookings;
drop policy if exists "System can insert logs" on booking_logs;

-- 2) SELECT: pelanggan milik sendiri + staf/owner bisnis terkait
drop policy if exists "Customers can view own bookings" on bookings;
create policy "Customers can view own bookings" on bookings
  for select using (customer_user_id = auth.uid());

drop policy if exists "Staff and owners can view bookings" on bookings;
create policy "Staff and owners can view bookings" on bookings
  for select using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff
      where user_id = auth.uid() and status = 'active'
    )
  );

-- 3) INSERT: hanya pelanggan untuk dirinya sendiri, atau staf/owner di bisnisnya
drop policy if exists "Customers can create own bookings" on bookings;
create policy "Customers can create own bookings" on bookings
  for insert with check (
    auth.uid() is not null
    and customer_user_id = auth.uid()
  );

drop policy if exists "Staff and owners can create bookings" on bookings;
create policy "Staff and owners can create bookings" on bookings
  for insert with check (
    business_id in (
      select id from businesses where owner_id = auth.uid()
      union
      select business_id from staff
      where user_id = auth.uid() and status = 'active'
    )
  );

-- 4) DELETE: selaraskan dengan permission app (owner + admin; kasir tidak)
drop policy if exists "Managers can delete bookings in their business" on bookings;
drop policy if exists "Kasir can delete bookings in their business" on bookings;
drop policy if exists "Owners can delete bookings" on bookings;
create policy "Owners can delete bookings" on bookings
  for delete using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

drop policy if exists "Admins can delete bookings" on bookings;
create policy "Admins can delete bookings" on bookings
  for delete using (
    business_id in (
      select business_id from staff
      where user_id = auth.uid() and status = 'active' and role = 'admin'
    )
  );

-- 5) booking_logs: insert hanya untuk booking yang bisa diakses
drop policy if exists "Authenticated can insert accessible booking logs" on booking_logs;
create policy "Authenticated can insert accessible booking logs" on booking_logs
  for insert with check (
    auth.uid() is not null
    and booking_id in (
      select b.id from bookings b
      where b.customer_user_id = auth.uid()
         or b.business_id in (
           select id from businesses where owner_id = auth.uid()
           union
           select business_id from staff
           where user_id = auth.uid() and status = 'active'
         )
    )
  );
